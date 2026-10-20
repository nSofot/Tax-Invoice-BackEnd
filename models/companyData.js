import mongoose from "mongoose";

const companyDataSchema = new mongoose.Schema({
    companyId: {
        type: String,
        required: true,
        unique: true
    },
    companyName: {
        type: String,
        required: true
    },
    companyMotto: {
        type: String
    },
    companyAddress: {
        type: String,
        required: true
    },
    companyMobile: {
        type: String,
    },
    companyPhone: {
        type: String,
    },
    companyEmail: {
        type: String
    },
    companyTaxNumber: {
        type: String
    },
    companyLogo: {
        type: String
    },
    companyWebsite: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const CompanyData = mongoose.model("CompanyData", companyDataSchema);

export default CompanyData;