import mongoose from 'mongoose';

const stationMetaSchema = new mongoose.Schema({
    stationId: { type: String, required: true },
    source:    { type: String, required: true, enum: ['fieldclimate', 'cesens'] },
    lat:       { type: Number, default: null },
    lon:       { type: Number, default: null },
}, { timestamps: true });

stationMetaSchema.index({ stationId: 1, source: 1 }, { unique: true });

export default mongoose.model('StationMeta', stationMetaSchema);
