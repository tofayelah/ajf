import fs from "fs";

const dbFile = "./database.json";
const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));

let repairedCount = 0;
let totalRepairedAmount = 0;

console.log("--- Missing Cash Posting Repair ---");

// 1. Check Admissions
if (db.admissions) {
  for (const adm of db.admissions) {
    if (adm.paymentMethod === 'CASH' && adm.status === 'ACTIVE') {
      const cash = db.cashTransactions?.find((c: any) => c.sourceId === adm.admissionId && c.sourceType === 'ADMISSION');
      if (!cash) {
        console.log(`[MISSING] Admission: ${adm.admissionId} | Amount: ${adm.amount} | Voucher: ${adm.voucherNo || 'N/A'}`);
        // Create missing
        if (!db.cashTransactions) db.cashTransactions = [];
        db.cashTransactions.push({
          transactionId: `CSH-ADM-${adm.admissionId}-${Date.now()}`,
          transactionDate: adm.createdAt,
          sourceType: 'ADMISSION',
          sourceId: adm.admissionId,
          voucherNo: adm.voucherNo || `V-ADM-${adm.admissionId}`,
          amount: adm.amount,
          cashIn: adm.amount,
          cashOut: 0,
          paymentMethod: 'CASH',
          description: `Repair missing cash for Admission ${adm.admissionId}`,
          status: 'POSTED',
          createdAt: new Date().toISOString(),
          recordedBy: 'SYSTEM'
        });
        repairedCount++;
        totalRepairedAmount += adm.amount;
      }
    }
  }
}

// 2. Check Capital Deposits
if (db.capitalDeposits) {
  for (const cap of db.capitalDeposits) {
    if (cap.paymentMethod === 'CASH' && cap.status === 'POSTED') {
      const cash = db.cashTransactions?.find((c: any) => c.sourceId === cap.depositId && c.sourceType === 'CAPITAL');
      if (!cash) {
        console.log(`[MISSING] Capital: ${cap.depositId} | Amount: ${cap.amount} | Voucher: ${cap.voucherNo || 'N/A'}`);
        if (!db.cashTransactions) db.cashTransactions = [];
        db.cashTransactions.push({
          transactionId: `CSH-CAP-${cap.depositId}-${Date.now()}`,
          transactionDate: cap.depositDate,
          sourceType: 'CAPITAL',
          sourceId: cap.depositId,
          voucherNo: cap.voucherNo || `V-CAP-${cap.depositId}`,
          amount: cap.amount,
          cashIn: cap.amount,
          cashOut: 0,
          paymentMethod: 'CASH',
          description: `Repair missing cash for Capital ${cap.depositId}`,
          status: 'POSTED',
          createdAt: new Date().toISOString(),
          recordedBy: 'SYSTEM'
        });
        repairedCount++;
        totalRepairedAmount += cap.amount;
      }
    }
  }
}

// 3. Check Collections
if (db.collections) {
  for (const col of db.collections) {
    if (col.paymentMethod === 'CASH' && col.status === 'POSTED') {
      const cash = db.cashTransactions?.find((c: any) => c.sourceId === col.collectionId && c.sourceType === 'COLLECTION');
      if (!cash) {
        console.log(`[MISSING] Collection: ${col.collectionId} | Amount: ${col.paidAmount} | Voucher: ${col.voucherNo || 'N/A'}`);
        if (!db.cashTransactions) db.cashTransactions = [];
        db.cashTransactions.push({
          transactionId: `CSH-COL-${col.collectionId}-${Date.now()}`,
          transactionDate: col.collectionDate,
          sourceType: 'COLLECTION',
          sourceId: col.collectionId,
          voucherNo: col.voucherNo || `V-COL-${col.collectionId}`,
          amount: col.paidAmount,
          cashIn: col.paidAmount,
          cashOut: 0,
          paymentMethod: 'CASH',
          description: `Repair missing cash for Collection ${col.collectionId}`,
          status: 'POSTED',
          createdAt: new Date().toISOString(),
          recordedBy: 'SYSTEM'
        });
        repairedCount++;
        totalRepairedAmount += col.paidAmount;
      }
    }
  }
}

console.log(`Repaired ${repairedCount} records. Total Amount Repaired: BDT ${totalRepairedAmount}`);
fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf8");
