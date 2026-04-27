export const calculateGST = (product) => {
    // 1. Identify Product Type & HSN
    // Categories based on name or type
    const name = (product.name || product.title || "").toLowerCase();
    let hsn = "9703"; // Default: Hand Embroidery Hoops/Handicraft
    let gstRate = 0.05; // Default 5% (Updated per GST Reform)

    if (name.includes("hoop")) {
        hsn = "9703";
        gstRate = 0.18; // Hoops are 18%
    } else if (name.includes("tote") || name.includes("bag")) {
        hsn = "4202";
        gstRate = 0.05;
    } else if (name.includes("diary") || name.includes("journal") || name.includes("notebook")) {
        hsn = "4820";
        gstRate = 0.05;
    } else if (name.includes("t-shirt") || name.includes("tshirt") || name.includes("tee")) {
        hsn = "6109";
        gstRate = 0.05;
    } else if (name.includes("gamcha") || name.includes("towel")) {
        hsn = "6302";
        gstRate = 0.05;
    }

    // 2. Reverse Calculate Tax
    // Price is Inclusive of Tax
    // Taxable Value = Price / (1 + Rate)
    const taxableValue = product.price / (1 + gstRate);
    const gstAmount = product.price - taxableValue;

    // Split CGST/SGST (intra-state assumption for now, or just show IGST)
    // Usually for simple bills we show IGST or split 50/50 CGST/SGST
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;

    return {
        hsn,
        rate: gstRate * 100, // percentage
        taxableValue: parseFloat(taxableValue.toFixed(2)),
        gstAmount: parseFloat(gstAmount.toFixed(2)),
        cgst: parseFloat(cgst.toFixed(2)),
        sgst: parseFloat(sgst.toFixed(2)),
        total: product.price
    };
};
