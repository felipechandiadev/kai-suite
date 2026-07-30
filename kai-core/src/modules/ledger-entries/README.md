# Motor de Asientos Automáticos - Guía de Referencia Rápida

## 🎯 Propósito

El motor de asientos es un servicio NestJS que genera automáticamente entradas de libro mayor (ledger entries) cada vez que se crea una transacción comercial. Garantiza:

- ✅ **Partida doble** (DEBE = HABER siempre)
- ✅ **Contabilidad coherente** (según reglas previamente definidas)
- ✅ **Validaciones** (saldo disponible, integridad referencial)
- ✅ **Auditoría** (registro inmutable de todos los movimientos)

---

## 📁 Estructura de Archivos

```
kai-core/src/modules/
├── ledger-entries/
│   ├── domain/
│   │   └── ledger-entry.entity.ts          (Entidad persistente)
│   ├── application/
│   │   └── ledger-entries.service.ts       (✨ MOTOR PRINCIPAL)
│   ├── infrastructure/
│   │   └── (repositorio aquí)
│   ├── presentation/
│   │   └── ledger-entries.controller.ts    (Endpoints DEBUG)
│   └── ledger-entries.module.ts            (Módulo inyectable)
│
├── accounting-rules/
│   ├── domain/
│   │   ├── accounting-rule.entity.ts       (Regla contable)
│   │   └── accounting-rules.seed.ts        (30+ reglas predefinidas)
│   ├── application/
│   │   └── accounting-rules.service.ts     (CRUD de reglas)
│   ├── presentation/
│   │   └── accounting-rules.controller.ts  (Endpoints REST)
│   └── accounting-rules.module.ts
│
└── transactions/
    ├── application/
    │   └── transactions.service.ts         (⚠️ Modificar aquí: inyectar LedgerEntriesService)
    └── ...

kai-core/ ├── SETUP_ACCOUNTING_ENGINE.sh              (Guía de instalación)
└── .github/accounting-rules.md             (Especificación completa)
```

---

## 🚀 Flujo de Ejecución (5 Fases)

```
1️⃣ PRE-VALIDACIÓN
   ↓
   - Verificar que NO hay asientos duplicados
   - V1: Saldo en banco >= monto transferencia
   - V2: Saldo en caja >= monto apertura sesión 
   - V4: Deuda cliente/proveedor >= pago
   ↓
   Si falla → RECHAZAR con código de error

2️⃣ MATCHING DE REGLAS
   ↓
   - Buscar AccountingRule donde:
     * companyId = transacción.companyId
     * transactionType = transacción.tipo
     * isActive = true
   - Ordenar por priority (menor primero)
   ↓
   Si NO hay reglas → WARNING pero continuar

3️⃣ GENERACIÓN DE ASIENTOS
   ↓
   Para cada regla:
     - Si TRANSACTION scope → generar 1 par (DEBE, HABER)
     - Si TRANSACTION_LINE scope → generar N pares (1 por línea)
   ↓
   Resultado: Array of LedgerEntryDto

4️⃣ VALIDACIÓN DE BALANZA
   ↓
   - SUM(Débitos) = SUM(Créditos) ± 0.01
   ↓
   Si falla → ROLLBACK

5️⃣ PERSISTENCIA
   ↓
   - INSERT en tabla ledger_entries
   - Log: "Válido: X asientos para tx ID"
   ↓
   Response: {status: "SUCCESS", entriesIds: [...]}
```

---

## 📋 Reglas Contables Predefinidas

### Categorías (A-G en accounting-rules.md)

| Módulo | Tipo Transacción | Reglas | Validaciones |
|--------|------------------|--------|-------------|
| **A. Banking** | PAYMENT_IN, BANK_WITHDRAWAL, BANK_TO_CASH_TRANSFER, CASH_DEPOSIT | 4 | V1, V2 |
| **B. Sales** | SALE, PAYMENT_IN | 6 | V4 |
| **C. Purchasing** | PURCHASE, SUPPLIER_PAYMENT | 5 | V4 |
| **D. Operations** | OPERATING_EXPENSE, PAYROLL | 2 | - |
| **E. Inventory** | TRANSFER_OUT/IN, ADJUSTMENT_IN/OUT | 3 | - |
| **F. Cash Sessions** | CASH_SESSION_* | 6 | V2 |
| **G. Returns** | SALE_RETURN, PURCHASE_RETURN | 4 | - |
| | | **Total: 30** | |

---

## 🔧 Configuración Inicial

### 1. Reemplazar PLACEHOLDERS

```bash
cd backend
export COMPANY_ID="550e8400-e29b-41d4-a716-446655440000"
export IVA_TAX_ID="660e8400-e29b-41d4-a716-446655440000"

sed -i "s/PLACEHOLDER_COMPANY_ID/$COMPANY_ID/g" src/modules/accounting-rules/domain/accounting-rules.seed.ts
sed -i "s/PLACEHOLDER_IVA_TAX_ID/$IVA_TAX_ID/g" src/modules/accounting-rules/domain/accounting-rules.seed.ts
```

### 2. Crear Reglas en BD

```bash
# Opción A: Via API (después que el servidor esté arriba)
curl -X POST http://localhost:3000/setup/initialize-accounting-rules

# Opción B: Seed SQL
npm run typeorm migration:create src/migrations/seed-accounting-rules
# Luego llenar migration con ACCOUNTING_RULES_SEED
```

### 3. Integrar en TransactionsService

```typescript
// kai-core/src/modules/transactions/application/transactions.service.ts

@Injectable()
export class TransactionsService {
  constructor(
    private transactionRepo: TransactionRepository,
    private ledgerService: LedgerEntriesService, // ← AGREGAR
  ) {}

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    const tx = await this.transactionRepo.save(dto);
    
    // Generar asientos automáticamente
    const ledgerResponse = await this.ledgerService.generateEntriesForTransaction(
      tx,
      tx.branchId
    );
    
    if (ledgerResponse.status === 'REJECTED') {
      await this.transactionRepo.remove(tx); // Rollback
      throw new BadRequestException(
        `Accounting failed: ${ledgerResponse.errors[0].message}`
      );
    }
    
    return tx;
  }
}
```

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Venta al Contado (CLP 1,190)

```json
POST /transactions
{
  "transactionType": "SALE",
  "paymentMethod": "CASH",
  "total": 1190,
  "taxAmount": 190,
  "lines": [
    {"productName": "Widget", "quantity": 1, "unitPrice": 1000, "taxId": "iVA-19-ID", "taxRate": 19}
  ]
}
```

**Asientos Generados Automáticamente:**

```
LedgerEntry 1:
  Account: 1.1.01 (Caja)
  Debit: 1,190 | Credit: 0
  
LedgerEntry 2:
  Account: 4.1.01 (Ingresos)
  Debit: 0 | Credit: 1,000
  
LedgerEntry 3:
  Account: 2.2.01 (IVA por pagar)
  Debit: 0 | Credit: 190

Balance: DEBE 1,190 = HABER 1,190 ✅
```

### Ejemplo 2: Transferencia Banco → Caja (Error Validación)

```json
POST /transactions
{
  "transactionType": "BANK_TO_CASH_TRANSFER",
  "metadata": {"bankToCashTransfer": true},
  "paymentMethod": "TRANSFER",
  "total": 2000000,
  "bankAccountKey": "CUENTA-001"
}
```

**Respuesta (V1 FALLA - Saldo insuficiente):**

```json
{
  "status": "REJECTED",
  "transactionId": "tx-123",
  "error": {
    "code": "INSUFFICIENT_BANK_BALANCE",
    "message": "Required: 2,000,000, Available: 1,500,000",
    "phase": "VALIDATION"
  }
}
```

---

## 🔍 Endpoints para Debug

### Crear Regla Manual

```bash
curl -X POST http://localhost:3000/accounting/rules \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "appliesTo": "TRANSACTION",
    "transactionType": "SALE",
    "debitAccountId": "acc-caja-001",
    "creditAccountId": "acc-ingresos-001",
    "priority": 10
  }'
```

### Listar Reglas por Tipo

```bash
curl -X GET "http://localhost:3000/accounting/rules/type/SALE?companyId=550e8400-e29b-41d4-a716-446655440000"
```

### Ver Asientos de Transacción

```bash
curl -X GET "http://localhost:3000/ledger-entries/transaction/tx-123"
```

---

## ⚠️ Validaciones (V1-V10)

| Código | Descripción | Fase | Acción |
|--------|-------------|------|--------|
| V1 | Saldo banco insuficiente para transferencia | PRE | RECHAZAR |
| V2 | Saldo caja insuficiente para abrir sesión | PRE | RECHAZAR |
| V3 | IVA por pagar < 0 sin compensar | PRE | RECHAZAR |
| V4 | Pago sobrepasa deuda de cliente/proveedor | PRE | RECHAZAR |
| V5 | DEBE ≠ HABER en asientos | BALANCE | ROLLBACK |
| V6 | Asientos duplicados para misma transacción | PRE | RECHAZAR |
| V7 | Período contable cerrado | PRE | RECHAZAR |
| V8 | Línea de inventario inválida | PRE | RECHAZAR |
| V9 | Código de cuenta duplicado | N/A | (BD constraint) |
| V10 | Jerarquía de cuentas inválida | N/A | (BD constraint) |

---

## 📈 Reporte de Balance General

```bash
curl -X GET "http://localhost:3000/ledger-entries/balance-sheet?asOfDate=2026-02-28&companyId=550e8400..."
```

**Response:**

```json
{
  "asOfDate": "2026-02-28",
  "balances": {
    "ASSET": {
      "1.1.01 Caja": 500000,
      "1.1.02 Banco": 2500000,
      "1.1.03 Clientes": 450000
    },
    "LIABILITY": {
      "2.1.01 Proveedores": 300000,
      "2.2.01 IVA por pagar": 125000
    },
    "EQUITY": {
      "3.1.01 Capital": 3000000
    }
  }
}
```

---

## 🐛 Troubleshooting

### "No accounting rules found"

**Causa**: No hay AccountingRule registradas para ese transactionType

**Solución**: 
1. Verificar que ACCOUNTING_RULES_SEED fue ejecutado
2. Verificar que companyId coincide
3. POST /accounting/rules para agregar regla manual

### "Balance mismatch"

**Causa**: Motor generó asientos que no balancea (DEBE ≠ HABER)

**Solución**:
1. Revisar la regla: debitAccountId y creditAccountId
2. Revisar el cálculo de montos en `getTransactionAmount()`
3. Agregar logs en `calculateEntries()`

### "Insufficient bank balance"

**Causa**: V1 rechazó transacción

**Solución**:
1. Depositar más efectivo en banco
2. POST /transactions CASH_DEPOSIT primero
3. Luego reintentar BANK_TO_CASH_TRANSFER (o SUPPLIER_PAYMENT según el caso)

---

## 📚 Referencias

- **Especificación Completa**: [.github/accounting-rules.md](../.github/accounting-rules.md)
- **Setup Guide**: [SETUP_ACCOUNTING_ENGINE.sh](./SETUP_ACCOUNTING_ENGINE.sh)
- **Source Code**: [LedgerEntriesService](./src/modules/ledger-entries/application/ledger-entries.service.ts)
- **Rules Seed**: [ACCOUNTING_RULES_SEED](./src/modules/accounting-rules/domain/accounting-rules.seed.ts)

---

## 🎓 Próximos Pasos

1. ✅ Motor implementado
2. ⏳ Inyectar en TransactionsService
3. ⏳ Implementar `getAccountBalance()` y `getPersonBalance()`
4. ⏳ Crear seeder de reglas
5. ⏳ Tests E2E
6. ⏳ Reportes financieros
7. ⏳ Integración nómina + pagos

---

**Fecha**: 20 de febrero de 2026  
**Versión**: 1.0.0  
**Estado**: Prototipo Implementado
