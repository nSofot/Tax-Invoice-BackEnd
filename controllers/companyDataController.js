import CompanyData from "../models/companyData.js";

export async function getCompanyData(req, res) {
    try {
        const companyData = await CompanyData.findOne({ companyId: "01" });

        if (!companyData) {
            return res.status(404).json({ error: "Company not found" });
        }

        res.status(200).json(companyData);
    } catch (error) {
        console.error("Error fetching company data:", error.message);
        res.status(500).json({ error: error.message });
    }
}


export async function createCompanyData(req, res) {
    try {
        const companyData = await CompanyData.create(req.body);
        res.status(201).json(companyData);
    } catch (error) {
        console.error("Error creating company data:", error.message);
        res.status(500).json({ error: error.message });
    }
}


// Update company data by companyId
export async function updateCompanyData(req, res) {
  try {
    const { companyId } = req.params; // get id from URL
    if (!companyId) return res.status(400).json({ error: "Company ID is required" });

    const updatedCompany = await CompanyData.findOneAndUpdate(
      { companyId },
      req.body,
      { new: true } // return updated document
    );

    if (!updatedCompany) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.status(200).json(updatedCompany);
  } catch (error) {
    console.error("Error updating company data:", error.message);
    res.status(500).json({ error: error.message });
  }
}