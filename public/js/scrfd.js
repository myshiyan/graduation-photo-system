class SCRFD {
    constructor(options = {}) {
        this.inputSize = options.inputSize || [640, 640];
        this.confThres = options.confThres || 0.5;
        this.iouThres = options.iouThres || 0.4;
        this.session = null;
        
        this.fmc = 3;
        this._featStrideFpn = [8, 16, 32];
        this._numAnchors = 2;
        this.useKps = true;
        this.mean = 127.5;
        this.std = 128.0;
        this.centerCache = {};
    }

    async loadModel(modelPath) {
        try {
            this.session = await ort.InferenceSession.create(modelPath, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            });
            console.log('SCRFD model loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load SCRFD model:', error);
            return false;
        }
    }

    distance2bbox(points, distance, maxShape = null) {
        const x1 = points.map((p, i) => p[0] - distance[i][0]);
        const y1 = points.map((p, i) => p[1] - distance[i][1]);
        const x2 = points.map((p, i) => p[0] + distance[i][2]);
        const y2 = points.map((p, i) => p[1] + distance[i][3]);

        let result = [];
        for (let i = 0; i < points.length; i++) {
            let bbox = [x1[i], y1[i], x2[i], y2[i]];
            if (maxShape) {
                bbox[0] = Math.max(0, Math.min(bbox[0], maxShape[1]));
                bbox[1] = Math.max(0, Math.min(bbox[1], maxShape[0]));
                bbox[2] = Math.max(0, Math.min(bbox[2], maxShape[1]));
                bbox[3] = Math.max(0, Math.min(bbox[3], maxShape[0]));
            }
            result.push(bbox);
        }
        return result;
    }

    distance2kps(points, distance, maxShape = null) {
        const preds = [];
        const numKps = distance[0].length / 2;
        
        for (let i = 0; i < points.length; i++) {
            const kps = [];
            for (let j = 0; j < numKps; j++) {
                const px = points[i][j % 2] + distance[i][j * 2];
                const py = points[i][j % 2 + 1] + distance[i][j * 2 + 1];
                if (maxShape) {
                    kps.push([
                        Math.max(0, Math.min(px, maxShape[1])),
                        Math.max(0, Math.min(py, maxShape[0]))
                    ]);
                } else {
                    kps.push([px, py]);
                }
            }
            preds.push(kps);
        }
        return preds;
    }

    nms(dets, iouThres) {
        const x1 = dets.map(d => d[0]);
        const y1 = dets.map(d => d[1]);
        const x2 = dets.map(d => d[2]);
        const y2 = dets.map(d => d[3]);
        const scores = dets.map(d => d[4]);
        
        const areas = x1.map((_, i) => (x2[i] - x1[i] + 1) * (y2[i] - y1[i] + 1));
        let order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
        
        const keep = [];
        while (order.length > 0) {
            const i = order[0];
            keep.push(i);
            
            const xx1 = order.slice(1).map(idx => Math.max(x1[i], x1[idx]));
            const yy1 = order.slice(1).map(idx => Math.max(y1[i], y1[idx]));
            const xx2 = order.slice(1).map(idx => Math.min(x2[i], x2[idx]));
            const yy2 = order.slice(1).map(idx => Math.min(y2[i], y2[idx]));
            
            const w = xx1.map((v, idx) => Math.max(0, xx2[idx] - xx1[idx] + 1));
            const h = yy1.map((v, idx) => Math.max(0, yy2[idx] - yy1[idx] + 1));
            const inter = w.map((v, idx) => v * h[idx]);
            const ovr = inter.map((v, idx) => v / (areas[i] + areas[order[idx + 1]] - inter[idx]));
            
            const indices = ovr.map((v, idx) => v <= iouThres ? idx : -1).filter(v => v >= 0);
            order = indices.map(idx => order[idx + 1]);
        }
        return keep;
    }

    async forward(imageData, width, height, threshold) {
        const scoresList = [];
        const bboxesList = [];
        const kpssList = [];
        
        const blob = this.preprocessImage(imageData, width, height);
        const inputTensor = new ort.Tensor('float32', blob, [1, 3, this.inputSize[1], this.inputSize[0]]);
        
        const results = await this.session.run({ [this.session.inputNames[0]]: inputTensor });
        const outputs = [];
        for (let i = 0; i < this.session.outputNames.length; i++) {
            outputs.push(results[this.session.outputNames[i]].data);
        }
        
        const fmc = this.fmc;
        for (let idx = 0; idx < this._featStrideFpn.length; idx++) {
            const stride = this._featStrideFpn[idx];
            const scores = outputs[idx];
            const bboxPreds = outputs[idx + fmc].map(v => v * stride);
            
            let kpsPreds = null;
            if (this.useKps) {
                kpsPreds = outputs[idx + fmc * 2].map(v => v * stride);
            }
            
            const featHeight = Math.floor(this.inputSize[1] / stride);
            const featWidth = Math.floor(this.inputSize[0] / stride);
            const key = `${featHeight},${featWidth},${stride}`;
            
            let anchorCenters;
            if (this.centerCache[key]) {
                anchorCenters = this.centerCache[key];
            } else {
                anchorCenters = [];
                for (let y = 0; y < featHeight; y++) {
                    for (let x = 0; x < featWidth; x++) {
                        const cx = x * stride;
                        const cy = y * stride;
                        if (this._numAnchors > 1) {
                            anchorCenters.push([cx, cy]);
                            anchorCenters.push([cx, cy]);
                        } else {
                            anchorCenters.push([cx, cy]);
                        }
                    }
                }
                if (Object.keys(this.centerCache).length < 100) {
                    this.centerCache[key] = anchorCenters;
                }
            }
            
            const posInds = [];
            for (let i = 0; i < scores.length; i++) {
                if (scores[i] >= threshold) {
                    posInds.push(i);
                }
            }
            
            const bboxes = this.distance2bbox(
                anchorCenters, 
                Array.from({ length: anchorCenters.length }, (_, i) => [
                    bboxPreds[i * 4], 
                    bboxPreds[i * 4 + 1], 
                    bboxPreds[i * 4 + 2], 
                    bboxPreds[i * 4 + 3]
                ])
            );
            
            const posScores = posInds.map(i => scores[i]);
            const posBboxes = posInds.map(i => bboxes[i]);
            
            scoresList.push(posScores);
            bboxesList.push(posBboxes);
            
            if (this.useKps && kpsPreds) {
                const kpss = this.distance2kps(
                    anchorCenters,
                    Array.from({ length: anchorCenters.length }, (_, i) => {
                        const kp = [];
                        for (let j = 0; j < 10; j++) {
                            kp.push(kpsPreds[i * 10 + j]);
                        }
                        return kp;
                    })
                );
                const posKpss = posInds.map(i => kpss[i]);
                kpssList.push(posKpss);
            }
        }
        
        return { scoresList, bboxesList, kpssList };
    }

    preprocessImage(imageData, origWidth, origHeight) {
        const [modelWidth, modelHeight] = this.inputSize;
        
        const imRatio = origHeight / origWidth;
        const modelRatio = modelHeight / modelWidth;
        
        let newWidth, newHeight;
        if (imRatio > modelRatio) {
            newHeight = modelHeight;
            newWidth = Math.floor(newHeight / imRatio);
        } else {
            newWidth = modelWidth;
            newHeight = Math.floor(newWidth * imRatio);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = modelWidth;
        canvas.height = modelHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, modelWidth, modelHeight);
        
        const imgCanvas = document.createElement('canvas');
        imgCanvas.width = origWidth;
        imgCanvas.height = origHeight;
        const imgCtx = imgCanvas.getContext('2d');
        
        const imgData = imgCtx.createImageData(origWidth, origHeight);
        for (let i = 0; i < imageData.length; i++) {
            imgData.data[i] = imageData[i];
        }
        imgCtx.putImageData(imgData, 0, 0);
        
        ctx.drawImage(imgCanvas, 0, 0, newWidth, newHeight);
        
        const processedData = ctx.getImageData(0, 0, modelWidth, modelHeight);
        const pixels = processedData.data;
        
        const blob = new Float32Array(3 * modelHeight * modelWidth);
        for (let y = 0; y < modelHeight; y++) {
            for (let x = 0; x < modelWidth; x++) {
                const idx = (y * modelWidth + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                
                blob[y * modelWidth + x] = (b - this.mean) / this.std;
                blob[modelHeight * modelWidth + y * modelWidth + x] = (g - this.mean) / this.std;
                blob[2 * modelHeight * modelWidth + y * modelWidth + x] = (r - this.mean) / this.std;
            }
        }
        
        return { blob, detScale: newHeight / origHeight };
    }

    async detect(imageData, origWidth, origHeight) {
        const [modelWidth, modelHeight] = this.inputSize;
        
        const preprocessed = this.preprocessImage(imageData, origWidth, origHeight);
        const blob = preprocessed.blob;
        const detScale = preprocessed.detScale;
        
        const inputTensor = new ort.Tensor('float32', blob, [1, 3, modelHeight, modelWidth]);
        
        const results = await this.session.run({ [this.session.inputNames[0]]: inputTensor });
        const outputs = [];
        for (let i = 0; i < this.session.outputNames.length; i++) {
            outputs.push(results[this.session.outputNames[i]].data);
        }
        
        const scoresList = [];
        const bboxesList = [];
        const kpssList = [];
        
        const fmc = this.fmc;
        for (let idx = 0; idx < this._featStrideFpn.length; idx++) {
            const stride = this._featStrideFpn[idx];
            const scores = outputs[idx];
            const bboxPreds = outputs[idx + fmc].map(v => v * stride);
            
            let kpsPreds = null;
            if (this.useKps) {
                kpsPreds = outputs[idx + fmc * 2].map(v => v * stride);
            }
            
            const featHeight = Math.floor(modelHeight / stride);
            const featWidth = Math.floor(modelWidth / stride);
            const key = `${featHeight},${featWidth},${stride}`;
            
            let anchorCenters;
            if (this.centerCache[key]) {
                anchorCenters = this.centerCache[key];
            } else {
                anchorCenters = [];
                for (let y = 0; y < featHeight; y++) {
                    for (let x = 0; x < featWidth; x++) {
                        const cx = x * stride;
                        const cy = y * stride;
                        anchorCenters.push([cx, cy]);
                        anchorCenters.push([cx, cy]);
                    }
                }
                if (Object.keys(this.centerCache).length < 100) {
                    this.centerCache[key] = anchorCenters;
                }
            }
            
            const posInds = [];
            for (let i = 0; i < scores.length; i++) {
                if (scores[i] >= this.confThres) {
                    posInds.push(i);
                }
            }
            
            const bboxes = [];
            for (let i = 0; i < anchorCenters.length; i++) {
                const p = anchorCenters[i];
                const x1 = p[0] - bboxPreds[i * 4];
                const y1 = p[1] - bboxPreds[i * 4 + 1];
                const x2 = p[0] + bboxPreds[i * 4 + 2];
                const y2 = p[1] + bboxPreds[i * 4 + 3];
                bboxes.push([x1, y1, x2, y2]);
            }
            
            const posScores = posInds.map(i => scores[i]);
            const posBboxes = posInds.map(i => bboxes[i]);
            
            scoresList.push(...posScores);
            bboxesList.push(...posBboxes);
            
            if (this.useKps && kpsPreds) {
                const kpss = [];
                for (let i = 0; i < anchorCenters.length; i++) {
                    const p = anchorCenters[i];
                    const kp = [];
                    for (let j = 0; j < 5; j++) {
                        const kx = p[j % 2] + kpsPreds[i * 10 + j * 2];
                        const ky = p[j % 2 + 1] + kpsPreds[i * 10 + j * 2 + 1];
                        kp.push([kx, ky]);
                    }
                    kpss.push(kp);
                }
                const posKpss = posInds.map(i => kpss[i]);
                kpssList.push(...posKpss);
            }
        }
        
        const preDets = [];
        for (let i = 0; i < bboxesList.length; i++) {
            const b = bboxesList[i];
            preDets.push([
                b[0] / detScale,
                b[1] / detScale,
                b[2] / detScale,
                b[3] / detScale,
                scoresList[i]
            ]);
        }
        
        preDets.sort((a, b) => b[4] - a[4]);
        
        const keep = this.nms(preDets, this.iouThres);
        const dets = keep.map(i => preDets[i]);
        
        let finalKpss = null;
        if (this.useKps && kpssList.length > 0) {
            const preKpss = keep.map(i => {
                const kp = kpssList[i];
                return kp.map(pt => [pt[0] / detScale, pt[1] / detScale]);
            });
            finalKpss = preKpss;
        }
        
        return { dets, kpss: finalKpss };
    }
}
