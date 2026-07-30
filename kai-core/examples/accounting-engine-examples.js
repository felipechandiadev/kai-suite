#!/usr/bin/env node

/**
 * EJEMPLOS DE USO - Motor de Asientos
 * 
 * Ejecutar estos comandos para probar el motor:
 * $ node examples/accounting-engine-examples.js
 * 
 * Prerequisitos:
 * - Backend corriendo: npm run start:dev
 * - Base de datos con companyId, accountIds, taxIds
 * - Reglas contables precargadas
 */

const BASE_URL = 'http://localhost:3000';

// ============================================
// EJEMPLO 1: Crear Regla Contable Manual
// ============================================
async function example1_createRule() {
  console.log('\n📋 EJEMPLO 1: Crear Regla Contable\n');

  const payload = {
    companyId: '550e8400-e29b-41d4-a716-446655440000', // Reemplazar
    appliesTo: 'TRANSACTION',
    transactionType: 'SALE',
    debitAccountId: 'acc-1.1.01-caja', // Reemplazar con ID real
    creditAccountId: 'acc-4.1.01-ingresos', // Reemplazar
    priority: 10,
    isActive: true,
  };

  console.log('REQUEST:');
  console.log(`POST ${BASE_URL}/accounting/rules`);
  console.log(JSON.stringify(payload, null, 2));

  console.log('\nRESPONSE (esperado):');
  console.log(`{
  "id": "rule-001",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "appliesTo": "TRANSACTION",
  "transactionType": "SALE",
  "debitAccountId": "acc-1.1.01-caja",
  "creditAccountId": "acc-4.1.01-ingresos",
  "priority": 10,
  "isActive": true,
  "createdAt": "2026-02-20T10:00:00Z"
}`);

  console.log('\n✅ Regla creada. Ahora crear transacción SALE para ver asientos generados.\n');
}

// ============================================
// EJEMPLO 2: Listar Reglas por Tipo
// ============================================
async function example2_listRules() {
  console.log('\n📋 EJEMPLO 2: Listar Reglas por Tipo de Transacción\n');

  const companyId = '550e8400-e29b-41d4-a716-446655440000'; // Reemplazar
  const transactionType = 'SALE';

  console.log('REQUEST:');
  console.log(`GET ${BASE_URL}/accounting/rules/type/${transactionType}?companyId=${companyId}`);

  console.log('\nRESPONSE (esperado):');
  console.log(`[
  {
    "id": "rule-001",
    "transactionType": "SALE",
    "appliesTo": "TRANSACTION_LINE",
    "debitAccountId": "acc-1.1.01-caja",
    "creditAccountId": "acc-4.1.01-ingresos",
    "priority": 20
  },
  {
    "id": "rule-002",
    "transactionType": "SALE",
    "appliesTo": "TRANSACTION_LINE",
    "taxId": "tax-iva-19",
    "debitAccountId": "acc-2.2.01-iva-por-pagar",
    "creditAccountId": "acc-4.1.01-ingresos",
    "priority": 21
  }
]`);

  console.log('\n✅ Reglas listadas. Notar que hay 2: una para producto, otra para IVA.\n');
}

// ============================================
// EJEMPLO 3: Crear Transacción SALE (Motor Automático)
// ============================================
async function example3_createSaleTransaction() {
  console.log('\n📋 EJEMPLO 3: Crear Transacción SALE (Motor Automático)\n');

  const payload = {
    branchId: 'branch-001', // Reemplazar
    transactionType: 'SALE',
    status: 'CONFIRMED',
    paymentMethod: 'CASH',
    pointOfSaleId: 'pos-001',
    customerId: null, // Cliente de mostrador
    userId: 'user-001',
    subtotal: 1000,
    taxAmount: 190,
    total: 1190,
    lines: [
      {
        lineNumber: 1,
        productName: 'Widget Premium',
        productSku: 'WID-001',
        quantity: 1,
        unitPrice: 1000,
        taxId: 'tax-iva-19', // ID del impuesto IVA 19%
        taxRate: 19,
        discountPercentage: 0,
        subtotal: 1000,
        total: 1190,
      },
    ],
  };

  console.log('REQUEST:');
  console.log(`POST ${BASE_URL}/transactions`);
  console.log(JSON.stringify(payload, null, 2));

  console.log('\nFLUJO AUTOMÁTICO (detrás de escenas):');
  console.log(`
  1. ✅ TransactionsController recibe POST
  2. ✅ TransactionsService.createTransaction()
  3. ✅ Guarda transacción en BD → tx.id = "sale-001"
  4. 🔄 Inyecta LedgerEntriesService.generateEntriesForTransaction()
  5. 🔍 Fase 1: Pre-validación (V1-V7) → OK
  6. 🔍 Fase 2: Busca AccountingRule donde transactionType="SALE"
     → Encuentra 2 reglas (producto + IVA)
  7. 📝 Fase 3: Genera asientos:
     - LedgerEntry (caja +1190)
     - LedgerEntry (ingresos -1000)
     - LedgerEntry (IVA por pagar -190)
  8. ✓ Fase 4: Valida balance (1190 = 1000+190) → OK
  9. 💾 Fase 5: INSERT 3 filas en ledger_entries
  10. ✅ Retorna transacción CON asientos generados
`);

  console.log('\nRESPONSE:');
  console.log(`{
  "id": "sale-001",
  "transactionType": "SALE",
  "status": "CONFIRMED",
  "paymentMethod": "CASH",
  "total": 1190,
  "subtotal": 1000,
  "taxAmount": 190,
  "createdAt": "2026-02-20T10:15:00Z",
  "_ledgerEntriesGenerated": {
    "status": "SUCCESS",
    "entriesGenerated": 3,
    "entriesIds": [
      "ledger-001",
      "ledger-002",
      "ledger-003"
    ],
    "balanceValidated": true,
    "executionTimeMs": 45
  }
}`);

  console.log('\n✅ Transacción SALE creada con asientos automáticos.\n');
}

// ============================================
// EJEMPLO 4: Ver Asientos Generados
// ============================================
async function example4_viewLedgerEntries() {
  console.log('\n📋 EJEMPLO 4: Ver Asientos Generados\n');

  const transactionId = 'sale-001';

  console.log('REQUEST:');
  console.log(`GET ${BASE_URL}/ledger-entries/transaction/${transactionId}`);

  console.log('\nRESPONSE:');
  console.log(`[
  {
    "id": "ledger-001",
    "transactionId": "sale-001",
    "accountId": "acc-1.1.01-caja",
    "accountCode": "1.1.01",
    "accountName": "Caja",
    "personId": null,
    "entryDate": "2026-02-20T10:15:00Z",
    "description": "Venta al contado (DEBIT)",
    "debit": 1190,
    "credit": 0,
    "createdAt": "2026-02-20T10:15:00Z"
  },
  {
    "id": "ledger-002",
    "transactionId": "sale-001",
    "accountId": "acc-4.1.01-ingresos",
    "accountCode": "4.1.01",
    "accountName": "Ingresos operacionales",
    "personId": null,
    "entryDate": "2026-02-20T10:15:00Z",
    "description": "Venta al contado (CREDIT)",
    "debit": 0,
    "credit": 1000,
    "createdAt": "2026-02-20T10:15:00Z"
  },
  {
    "id": "ledger-003",
    "transactionId": "sale-001",
    "accountId": "acc-2.2.01-iva-por-pagar",
    "accountCode": "2.2.01",
    "accountName": "IVA por pagar",
    "personId": null,
    "entryDate": "2026-02-20T10:15:00Z",
    "description": "IVA cobrado (CREDIT)",
    "debit": 0,
    "credit": 190,
    "createdAt": "2026-02-20T10:15:00Z"
  }
]

VALIDACIÓN MANUAL:
  DÉBITOS:   1.1.01 Caja = 1,190
  CRÉDITOS:  4.1.01 Ingresos (1,000) + 2.2.01 IVA (190) = 1,190
  BALANCE:   1,190 = 1,190 ✅
`);

  console.log('\n✅ Asientos generados correctamente.\n');
}

// ============================================
// EJEMPLO 5: Error - Saldo Insuficiente (V1)
// ============================================
async function example5_errorInsufficientBalance() {
  console.log('\n⚠️ EJEMPLO 5: Error - Validación V1 (Saldo Insuficiente)\n');

  const payload = {
    branchId: 'branch-001',
    transactionType: 'PAYMENT_OUT',
    status: 'CONFIRMED',
    paymentMethod: 'TRANSFER',
    metadata: { bankToCashTransfer: true },
    total: 5000000, // Pedir CLP 5 millones
    bankAccountKey: 'CUENTA-001',
  };

  console.log('SITUACIÓN:');
  console.log('  - Saldo actual en banco: CLP 1,500,000');
  console.log('  - Solicita transferencia: CLP 5,000,000');
  console.log('  - V1 Validation: 1,500,000 < 5,000,000 → FAIL');

  console.log('\nREQUEST:');
  console.log(`POST ${BASE_URL}/transactions`);
  console.log(JSON.stringify(payload, null, 2));

  console.log('\nRESPONSE (ERROR):');
  console.log(`{
  "statusCode": 400,
  "status": "REJECTED",
  "transactionId": null,
  "error": {
    "code": "INSUFFICIENT_BANK_BALANCE",
    "message": "Fondos insuficientes en cuenta bancaria. Requerido: 5,000,000, Disponible: 1,500,000",
    "severity": "ERROR",
    "phase": "VALIDATION"
  },
  "suggestion": "Máximo a transferir: CLP 1,500,000"
}`);

  console.log('\n❌ Transacción RECHAZADA. Usuario debe reducir monto o depositar más.\n');
}

// ============================================
// EJEMPLO 6: Error - Período Cerrado (V7)
// ============================================
async function example6_errorPeriodClosed() {
  console.log('\n⚠️ EJEMPLO 6: Error - Validación V7 (Período Contable Cerrado)\n');

  const payload = {
    branchId: 'branch-001',
    transactionType: 'SALE',
    status: 'CONFIRMED',
    paymentMethod: 'CASH',
    total: 1000,
  };

  console.log('SITUACIÓN:');
  console.log('  - Intenta crear venta el 2026-02-20');
  console.log('  - Período febrero está CERRADO (no permite nuevas transacciones)');
  console.log('  - V7 Validation: period.status = "CLOSED" → FAIL');

  console.log('\nREQUEST:');
  console.log(`POST ${BASE_URL}/transactions`);
  console.log(JSON.stringify(payload, null, 2));

  console.log('\nRESPONSE (ERROR):');
  console.log(`{
  "statusCode": 400,
  "status": "REJECTED",
  "error": {
    "code": "PERIOD_CLOSED",
    "message": "Período contable cerrado. No se permiten nuevas transacciones.",
    "severity": "ERROR",
    "phase": "VALIDATION",
    "period": "febrero-2026"
  }
}`);

  console.log('\n❌ Transacción RECHAZADA. Admin debe abrir período o usar período anterior.\n');
}

// ============================================
// EJEMPLO 7: Transferencia Banco → Caja (Válida)
// ============================================
async function example7_bankToCashTransfer() {
  console.log('\n📋 EJEMPLO 7: Transferencia Banco → Caja (V1 OK)\n');

  const payload = {
    branchId: 'branch-001',
    transactionType: 'PAYMENT_OUT',
    status: 'CONFIRMED',
    paymentMethod: 'TRANSFER',
    metadata: { bankToCashTransfer: true },
    total: 500000, // CLP 500k
    bankAccountKey: 'CUENTA-001',
  };

  console.log('SITUACIÓN:');
  console.log('  - Saldo banco: CLP 1,000,000');
  console.log('  - Solicita: CLP 500,000');
  console.log('  - V1 Validation: 1,000,000 >= 500,000 → PASS');

  console.log('\nFLUJO:');
  console.log('  1. Pre-validación V1 → OK\n');
  console.log('  2. Busca AccountingRule:');
  console.log('     WHERE transactionType="PAYMENT_OUT" AND metadata.bankToCashTransfer=true\n');
  console.log('  3. Genera asientos:');
  console.log('     DEBE 1.1.01 Caja → 500,000');
  console.log('     HABER 1.1.02 Banco → 500,000\n');
  console.log('  4. Balance: 500,000 = 500,000 ✓\n');
  console.log('  5. Finalmente:');
  console.log('     Saldo banco nuevo: 1,000,000 - 500,000 = 500,000');
  console.log('     Saldo caja nuevo: anterior + 500,000');

  console.log('\nRESPONSE (SUCCESS):');
  console.log(`{
  "id": "tx-transfer-001",
  "transactionType": "PAYMENT_OUT",
  "status": "CONFIRMED",
  "total": 500000,
  "metadata": {"bankToCashTransfer": true},
  "_ledgerEntriesGenerated": {
    "status": "SUCCESS",
    "entriesGenerated": 2,
    "entriesIds": ["ledger-101", "ledger-102"],
    "balanceValidated": true
  }
}`);

  console.log('\n✅ Transferencia completada con asientos contables.\n');
}

// ============================================
// EJEMPLO 8: Apertura Sesión Caja (V2)
// ============================================
async function example8_cashSessionOpening() {
  console.log('\n📋 EJEMPLO 8: Apertura Sesión Caja (V2 - Validación Saldo)\n');

  const payload = {
    branchId: 'branch-001',
    transactionType: 'CASH_SESSION_OPENING',
    pointOfSaleId: 'pos-001',
    status: 'CONFIRMED',
    total: 300000, // Fondo de apertura
  };

  console.log('CASO A: CON SALDO ✅');
  console.log('  - Saldo caja general: CLP 500,000');
  console.log('  - Solicita fondo: CLP 300,000');
  console.log('  - V2 Validation: 500,000 >= 300,000 → PASS\n');

  console.log('REQUEST:');
  console.log(`POST ${BASE_URL}/transactions`);
  console.log(JSON.stringify(payload, null, 2));

  console.log('\nRESPONSE (SUCCESS):');
  console.log(`{
  "id": "tx-session-001",
  "transactionType": "CASH_SESSION_OPENING",
  "pointOfSaleId": "pos-001",
  "total": 300000,
  "status": "CONFIRMED",
  "_ledgerEntriesGenerated": {
    "status": "SUCCESS",
    "entriesGenerated": 2,
    "entriesIds": ["ledger-201", "ledger-202"]
  }
}`);

  console.log('\n---\n');
  console.log('CASO B: SIN SALDO ❌');
  console.log('  - Saldo caja general: CLP 200,000');
  console.log('  - Solicita fondo: CLP 300,000');
  console.log('  - V2 Validation: 200,000 < 300,000 → FAIL\n');

  console.log('RESPONSE (ERROR):');
  console.log(`{
  "statusCode": 400,
  "error": {
    "code": "INSUFFICIENT_CASH_FOR_SESSION",
    "message": "Fondos insuficientes en caja general. Requerido: 300,000, Disponible: 200,000",
    "severity": "ERROR",
    "phase": "VALIDATION"
  }
}`);

  console.log('\n❌ Sesión NO se abre. Usuario debe depositar más efectivo primero.\n');
}

// ============================================
// MAIN: Ejecutar ejemplos
// ============================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      EJEMPLOS - Motor de Asientos Automáticos            ║');
  console.log('║                                                          ║');
  console.log('║      Guía de referencia rápida de endpoints y flows     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await example1_createRule();
  await example2_listRules();
  await example3_createSaleTransaction();
  await example4_viewLedgerEntries();
  await example5_errorInsufficientBalance();
  await example6_errorPeriodClosed();
  await example7_bankToCashTransfer();
  await example8_cashSessionOpening();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    FIN DE EJEMPLOS                       ║');
  console.log('║                                                          ║');
  console.log('║  Para probar en vivo:                                   ║');
  console.log('║  1. npm run start:dev                                   ║');
  console.log('║  2. curl http://localhost:3000/accounting/rules         ║');
  console.log('║  3. POST /transactions con payloads de arriba            ║');
  console.log('║                                                          ║');
  console.log('║  Documentación: .github/accounting-rules.md             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
