import dynamic from 'next/dynamic';

export const generateInvoicePDF = async (order) => {
    // Escape when building / SSR natively to prevent Turbopack errors entirely. This check works.
    if (typeof window === "undefined") {
        console.warn("Skipping PDF generation vertically on server.");
        return;
    }

    // Explicitly load browser-side modules dynamically inside!
    // NextJS understands this when called from a Client Event like onClick properly.
    const _jspdf = await import('jspdf');
    const _autotable = await import('jspdf-autotable');

    const jsPDF = _jspdf.default || _jspdf.jsPDF || _jspdf;
    const autoTable = _autotable.default || _autotable;

    const doc = new jsPDF("p", "mm", "a4");

    // === HEADER ===
    doc.setFontSize(22);
    doc.text("M/s COSTERBOX PRIVATE LIMITED", 14, 20);

    doc.setFontSize(10);
    doc.text("C/o Kanhaiya Lal Soni, Morla Rd, Ward No 2", 14, 26);
    doc.text("Lamba Hari Singh, Tonk, Rajasthan - 304503", 14, 30);
    doc.text("GSTIN: 08AALCC8989L1ZK", 14, 35);
    doc.text("Contact: contact@costerbox.in", 14, 40);

    doc.line(14, 45, 196, 45); // Horizontal Line

    // === INVOICE DETAILS ===
    doc.setFontSize(12);
    doc.text("TAX INVOICE", 14, 55);

    doc.setFontSize(10);
    // Handle potential missing data safely
    const safeDate = order.createdAt?.seconds
        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString()
        : new Date().toLocaleDateString();

    doc.text(`Invoice No: INV-${order.orderId || 'PENDING'}`, 14, 62);
    doc.text(`Date: ${safeDate}`, 14, 67);

    // === BILL TO ===
    const shipping = order.shipping || {};
    doc.text("Bill To:", 130, 55);
    doc.text(`${shipping.firstName || ''} ${shipping.lastName || ''}`, 130, 60);
    doc.text(shipping.address || '', 130, 65);
    doc.text(`${shipping.city || ''} - ${shipping.zip || ''}`, 130, 70);
    doc.text(`Ph: ${shipping.phone || ''}`, 130, 75);

    // === TABLE ===
    const tableColumn = ["#", "Item Description", "HSN", "Qty", "Rate", "Taxable", "GST %", "Tax Amt", "Total"];
    const tableRows = [];

    let totalTaxable = 0;
    let totalTax = 0;
    let grandTotal = 0;

    const items = Array.isArray(order.items) ? order.items : [];

    items.forEach((item, index) => {
        const name = (item.name || "Item").toLowerCase();
        const unitPrice = Number(item.price) || 0;
        const startQty  = Number(item.quantity) || 1;

        // ─────────────────────────────────────────────────────────────────
        //  GST CLASSIFICATION — as per GST 2.0 reforms
        //  Price threshold: clothing/apparel ≤ ₹2,500 → 5%, > ₹2,500 → 18%
        // ─────────────────────────────────────────────────────────────────
        let hsn  = "6307"; // Sensible default for misc handcrafted textile goods
        let rate = 0.05;   // Default 5% (most handcrafted items fall here)

        // ── 1. HAND EMBROIDERY COTTON T-SHIRT / TEE (HSN 6109) ───────────
        //    ≤ ₹2,500 → 5%  |  > ₹2,500 → 18%
        if (name.includes("t-shirt") || name.includes("tshirt") || name.includes("tee")) {
            hsn  = "6109";
            rate = unitPrice > 2500 ? 0.18 : 0.05;
        }

        // ── 2. SHIRTS – Formal / Semi-Formal (HSN 6205) ──────────────────
        //    ≤ ₹2,500 → 5%  |  > ₹2,500 → 18%
        else if (name.includes("shirt") && !name.includes("t-shirt") && !name.includes("tshirt")) {
            hsn  = "6205";
            rate = unitPrice > 2500 ? 0.18 : 0.05;
        }

        // ── 3. PANTS / TROUSERS (HSN 6203 / 6204) ────────────────────────
        //    ≤ ₹2,500 → 5%  |  > ₹2,500 → 18%
        else if (name.includes("pant") || name.includes("trouser") || name.includes("bottom")) {
            hsn  = "6203";
            rate = unitPrice > 2500 ? 0.18 : 0.05;
        }

        // ── 4. JACKETS – Light / Medium (HSN 6201) ───────────────────────
        //    ≤ ₹2,500 → 5%  |  > ₹2,500 → 18%
        else if (name.includes("jacket") || name.includes("coat") || name.includes("blazer")) {
            hsn  = "6201";
            rate = unitPrice > 2500 ? 0.18 : 0.05;
        }

        // ── 5. HANDMADE DIARIES / JOURNALS / NOTEBOOKS (HSN 5810) ────────
        //    Handcrafted textiles/embroidery category — flat 5%
        else if (name.includes("diary") || name.includes("journal") || name.includes("notebook")) {
            hsn  = "5810";
            rate = 0.05;
        }

        // ── 6. COTTON GAMCHA (HSN 5208 – woven cotton fabrics) ───────────
        //    Flat 5%
        else if (name.includes("gamcha") || name.includes("towel")) {
            hsn  = "5208";
            rate = 0.05;
        }

        // ── 7. COTTON CANVAS TOTE BAGS (HSN 6307) ────────────────────────
        //    Flat 5%
        else if (name.includes("tote") || name.includes("bag")) {
            hsn  = "6307";
            rate = 0.05;
        }

        // ── 8. HOOPS / DECORATIVE WALL ART (HSN 9703) ────────────────────
        //    Handcrafted decorative items — flat 12%
        else if (name.includes("hoop") || name.includes("wall") || name.includes("decor")) {
            hsn  = "9703";
            rate = 0.12;
        }

        // ── 9. DUPATTA / STOLE / SCARF (HSN 6214) ────────────────────────
        else if (name.includes("dupatta") || name.includes("stole") || name.includes("scarf") || name.includes("shawl")) {
            hsn  = "6214";
            rate = 0.05;
        }

        // ── 10. LEHENGA / SUIT / ETHNIC WEAR (HSN 6211) ──────────────────
        //     ≤ ₹2,500 → 5%  |  > ₹2,500 → 18%
        else if (name.includes("lehenga") || name.includes("suit") || name.includes("kurta") || name.includes("kurti") || name.includes("salwar")) {
            hsn  = "6211";
            rate = unitPrice > 2500 ? 0.18 : 0.05;
        }

        // ─────────────────────────────────────────────────────────────────
        //  GST Calculation (price stored inclusive of GST)
        // ─────────────────────────────────────────────────────────────────
        const taxableUnit = unitPrice / (1 + rate);
        const taxUnit     = unitPrice - taxableUnit;

        const rowTotal   = unitPrice    * startQty;
        const rowTaxable = taxableUnit  * startQty;
        const rowTax     = taxUnit      * startQty;

        totalTaxable += rowTaxable;
        totalTax     += rowTax;
        grandTotal   += rowTotal;

        tableRows.push([
            index + 1,
            item.name || "Item",
            hsn,
            startQty,
            taxableUnit.toFixed(2),
            rowTaxable.toFixed(2),
            `${(rate * 100).toFixed(0)}%`,
            rowTax.toFixed(2),
            rowTotal.toFixed(2)
        ]);
    });

    // Use explicit autoTable function call
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 85,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] },
        styles: { fontSize: 8 }
    });

    // === TOTALS SECTION ===
    const finalY = (doc.lastAutoTable?.finalY || 85) + 10;

    doc.setFontSize(10);
    doc.text(`Total Taxable Value: Rs. ${totalTaxable.toFixed(2)}`, 130, finalY);
    doc.text(`Total Tax Amount: Rs. ${totalTax.toFixed(2)}`, 130, finalY + 5);

    doc.setFontSize(12);
    // Use the calculated total from items to ensure consistency with the table
    doc.text(`Total Amount: Rs. ${grandTotal.toFixed(2)}`, 130, finalY + 12);

    // Show Advance / Due if applicable
    if (order.payment && Number(order.payment.pendingAmount) > 0) {
        doc.setFontSize(10);
        doc.text(`Advance Paid: Rs. ${Number(order.payment.paidAmount).toFixed(2)}`, 130, finalY + 18);

        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38); // Red color for attention
        doc.text(`Balance Due: Rs. ${Number(order.payment.pendingAmount).toFixed(2)}`, 130, finalY + 25);
        doc.setTextColor(0, 0, 0); // Reset color
    } else if (order.payment) {
        // Full Payment Case
        doc.setFontSize(10);
        doc.setTextColor(22, 101, 52); // Green
        doc.text(`Paid In Full`, 130, finalY + 18);
        doc.setTextColor(0, 0, 0);
    }

    doc.setFontSize(8);
    doc.text("* This is a computer generated invoice.", 14, finalY + 35);

    // Download
    doc.save(`Invoice_${order.orderId || 'new'}.pdf`);
};
