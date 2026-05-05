import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
    console.log('🌱 Starting seed...');

    // ==========================================
    // 1. Create tenants
    // ==========================================
    const tenant1 = await prisma.tenant.upsert({
        where: { code: 'DEM' },
        update: {},
        create: {
            name: 'Demo Mağaza',
            code: 'DEM',
            isActive: true,
            settings: {
                currency: 'TRY',
                negativeStockAllowed: false,
                stockReservationTTL: 900, // 15 minutes
                defaultKdvRate: 20,
            },
        },
    });

    const tenant2 = await prisma.tenant.upsert({
        where: { code: 'TST' },
        update: {},
        create: {
            name: 'Test Mağaza',
            code: 'TST',
            isActive: true,
            settings: {
                currency: 'TRY',
                negativeStockAllowed: false,
                stockReservationTTL: 600,
                defaultKdvRate: 20,
            },
        },
    });

    console.log(`✅ Tenants created: ${tenant1.name}, ${tenant2.name}`);

    // ==========================================
    // 2. Create users for each tenant
    const passwordHash = await bcrypt.hash('1212', 12);

    const users = [
        {
            tenantId: tenant1.id,
            email: 'info@azemyazilim.com',
            username: 'info',
            firstName: 'Admin',
            lastName: 'Kullanıcı',
            role: UserRole.TENANT_ADMIN,
        },
        {
            tenantId: tenant1.id,
            email: 'magaza@demo.com',
            username: 'magaza',
            firstName: 'Mağaza',
            lastName: 'Müdürü',
            role: UserRole.STORE_MANAGER,
        },
        {
            tenantId: tenant1.id,
            email: 'kasiyer@demo.com',
            username: 'kasiyer',
            firstName: 'Kasiyer',
            lastName: 'Demo',
            role: UserRole.CASHIER,
        },
        {
            tenantId: tenant1.id,
            email: 'satis@demo.com',
            username: 'satis',
            firstName: 'Satış',
            lastName: 'Personeli',
            role: UserRole.SALES_STAFF,
        },
        {
            tenantId: tenant2.id,
            email: 'admin@test.com',
            username: 'testadmin',
            firstName: 'Test',
            lastName: 'Admin',
            role: UserRole.TENANT_ADMIN,
        },
    ];

    for (const user of users) {
        await prisma.user.upsert({
            where: {
                tenantId_email: { tenantId: user.tenantId, email: user.email },
            },
            update: {},
            create: {
                ...user,
                passwordHash,
            },
        });
    }

    console.log(`✅ Users created: ${users.length} users`);

    // ==========================================
    // 3. Create size sets
    // ==========================================
    const sizeSets = [
        {
            tenantId: tenant1.id,
            name: 'Yetişkin Üst Beden',
            sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
        },
        {
            tenantId: tenant1.id,
            name: 'Yetişkin Alt Beden',
            sizes: JSON.stringify(['28', '29', '30', '31', '32', '33', '34', '36', '38']),
        },
        {
            tenantId: tenant1.id,
            name: 'Çocuk Beden',
            sizes: JSON.stringify(['1-2Y', '2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '9-10Y', '11-12Y', '13-14Y']),
        },
        {
            tenantId: tenant1.id,
            name: 'Ayakkabı Beden',
            sizes: JSON.stringify(['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']),
        },
    ];

    for (const sizeSet of sizeSets) {
        await prisma.sizeSet.upsert({
            where: {
                tenantId_name: { tenantId: sizeSet.tenantId, name: sizeSet.name },
            },
            update: {},
            create: sizeSet,
        });
    }

    console.log(`✅ Size sets created: ${sizeSets.length}`);

    // ==========================================
    // 3b. Catalog masters (categories, brands, colors)
    // ==========================================
    const ensureCategory = async (name: string, parentId: string | null) => {
        const ex = await prisma.productCategory.findFirst({
            where: { tenantId: tenant1.id, name, parentId },
        });
        if (ex) return ex;
        return prisma.productCategory.create({
            data: { tenantId: tenant1.id, name, parentId },
        });
    };

    const ust = await ensureCategory('Üst Giyim', null);
    const alt = await ensureCategory('Alt Giyim', null);
    await ensureCategory('Tişört', ust.id);
    await ensureCategory('Jean', alt.id);

    await prisma.productBrand.createMany({
        data: [
            { tenantId: tenant1.id, name: 'TextileBrand', code: 'TXT' },
            { tenantId: tenant1.id, name: 'KidsBrand', code: 'KDS' },
        ],
        skipDuplicates: true,
    });

    await prisma.productColor.createMany({
        data: [
            { tenantId: tenant1.id, name: 'Siyah', code: 'SYH' },
            { tenantId: tenant1.id, name: 'Beyaz', code: 'BYZ' },
            { tenantId: tenant1.id, name: 'Lacivert', code: 'LCV' },
        ],
        skipDuplicates: true,
    });

    console.log('✅ Catalog masters seeded (categories, brands, colors)');

    // ==========================================
    // 4. Create sample products and variants
    // ==========================================
    const product1 = await prisma.product.create({
        data: {
            tenantId: tenant1.id,
            name: 'Basic Tişört',
            brand: 'TextileBrand',
            category: 'Üst Giyim',
            subcategory: 'Tişört',
            gender: 'Unisex',
            costPrice: 45.00,
            salePrice: 129.90,
            kdvRate: 20.00,
        },
    });

    const product2 = await prisma.product.create({
        data: {
            tenantId: tenant1.id,
            name: 'Slim Fit Jean',
            brand: 'TextileBrand',
            category: 'Alt Giyim',
            subcategory: 'Jean',
            gender: 'Erkek',
            costPrice: 85.00,
            salePrice: 249.90,
            kdvRate: 20.00,
        },
    });

    const product3 = await prisma.product.create({
        data: {
            tenantId: tenant1.id,
            name: 'Çocuk Sweatshirt',
            brand: 'KidsBrand',
            category: 'Çocuk',
            subcategory: 'Sweatshirt',
            gender: 'Çocuk',
            costPrice: 35.00,
            salePrice: 99.90,
            kdvRate: 10.00, // Children's clothing: 10% KDV
        },
    });

    console.log(`✅ Products created: ${product1.name}, ${product2.name}, ${product3.name}`);

    // Create variants for product1 (Tişört - multiple colors & sizes)
    const colors = [
        { name: 'Siyah', code: 'SYH' },
        { name: 'Beyaz', code: 'BYZ' },
        { name: 'Lacivert', code: 'LCV' },
    ];
    const sizes = ['S', 'M', 'L', 'XL'];

    let variantCount = 0;
    let productSeq = 1;

    for (const color of colors) {
        for (const size of sizes) {
            const sizeCode = size.length === 1 ? `0${size}` : size.substring(0, 2);
            // Barcode: [TenantCode(3)][ProductSeq(6)][ColorCode(3)][SizeCode(2)][CheckDigit(2)]
            const barcodeBase = `DEM${String(productSeq).padStart(6, '0')}${color.code}${sizeCode}`;
            const checkDigit = calculateLuhnCheckDigit(barcodeBase);
            const barcode = `${barcodeBase}${checkDigit}`;

            await prisma.productVariant.create({
                data: {
                    tenantId: tenant1.id,
                    productId: product1.id,
                    barcode,
                    color: color.name,
                    colorCode: color.code,
                    size,
                    sizeCode,
                    stockQuantity: Math.floor(Math.random() * 20) + 5,
                    minStockLevel: 3,
                },
            });
            variantCount++;
        }
        productSeq++;
    }

    // Create variants for product2 (Jean - sizes)
    const jeanSizes = ['30', '31', '32', '33', '34'];
    for (const size of jeanSizes) {
        const barcodeBase = `DEM${String(productSeq).padStart(6, '0')}LCV${size}`;
        const checkDigit = calculateLuhnCheckDigit(barcodeBase);
        const barcode = `${barcodeBase}${checkDigit}`;

        await prisma.productVariant.create({
            data: {
                tenantId: tenant1.id,
                productId: product2.id,
                barcode,
                color: 'Lacivert',
                colorCode: 'LCV',
                size,
                sizeCode: size,
                stockQuantity: Math.floor(Math.random() * 15) + 3,
                minStockLevel: 2,
            },
        });
        variantCount++;
        productSeq++;
    }

    console.log(`✅ Variants created: ${variantCount}`);

    // ==========================================
    // 5. Sample Customers (Faz 2)
    // ==========================================
    const customer1 = await prisma.customer.create({
        data: {
            tenantId: tenant1.id,
            code: 'MUS-001',
            name: 'Ahmet',
            surname: 'Yılmaz',
            companyName: 'Yılmaz Tekstil Ltd.',
            taxId: '1234567890',
            taxOffice: 'Kadıköy VD',
            phone: '+905551234567',
            email: 'ahmet@yilmaztekstil.com',
            city: 'İstanbul',
            district: 'Kadıköy',
            creditLimit: 10000,
            creditLimitAction: 'WARN',
        },
    });
    const customer2 = await prisma.customer.create({
        data: {
            tenantId: tenant1.id,
            code: 'MUS-002',
            name: 'Fatma',
            surname: 'Demir',
            phone: '+905559876543',
            email: 'fatma@email.com',
            city: 'Ankara',
            district: 'Çankaya',
            creditLimit: 5000,
            creditLimitAction: 'BLOCK',
        },
    });
    console.log(`✅ Customers created: ${customer1.name}, ${customer2.name}`);

    // ==========================================
    // 6. Sample Campaigns (Faz 1)
    // ==========================================
    await prisma.campaign.create({
        data: {
            tenantId: tenant1.id, name: 'Yaz Sezonu %20 İndirim', type: 'PERCENTAGE',
            rules: { discountPercent: 20, categories: ['Üst Giyim'], brands: [] },
            startDate: new Date('2026-06-01'), endDate: new Date('2026-08-31'), priority: 80,
        },
    });
    await prisma.campaign.create({
        data: {
            tenantId: tenant1.id, name: '3 Al 2 Öde', type: 'X_FOR_Y',
            rules: { buyQuantity: 3, getQuantity: 1, categories: [], brands: ['TextileBrand'] },
            startDate: new Date('2026-05-01'), endDate: new Date('2026-12-31'), priority: 60,
        },
    });
    console.log('✅ Campaigns created: 2');

    // ==========================================
    // 7. Sample Branches (Faz 4)
    // ==========================================
    await prisma.branch.create({
        data: { tenantId: tenant1.id, name: 'Kadıköy Şubesi', code: 'KDK', city: 'İstanbul', phone: '+902161234567', isMain: true },
    });
    await prisma.branch.create({
        data: { tenantId: tenant1.id, name: 'Bakırköy Şubesi', code: 'BKR', city: 'İstanbul', phone: '+902129876543' },
    });
    console.log('✅ Branches created: 2');

    // ==========================================
    // 8. Sample Expenses (Faz 3)
    // ==========================================
    const expenseCategories = [
        { type: 'EXPENSE', category: 'Kira', amount: 15000 },
        { type: 'EXPENSE', category: 'Elektrik', amount: 2500 },
        { type: 'EXPENSE', category: 'Personel Maaşı', amount: 45000, isRecurring: true, recurringDay: 1 },
        { type: 'INCOME', category: 'Kira Geliri', amount: 3000 },
    ];
    for (const exp of expenseCategories) {
        await prisma.expense.create({
            data: { tenantId: tenant1.id, ...exp, type: exp.type as any, createdBy: users[0].email === 'admin@demo.com' ? tenant1.id : tenant1.id },
        });
    }
    console.log(`✅ Expenses created: ${expenseCategories.length}`);

    console.log('🎉 Seed completed successfully!');
}

/**
 * Calculate a 2-digit Luhn check digit for barcode validation.
 */
function calculateLuhnCheckDigit(input: string): string {
    const digits = input.split('').map((c) => c.charCodeAt(0) % 10);
    let sum = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
        let d = digits[i];
        if ((digits.length - i) % 2 === 0) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
    }
    const check1 = (10 - (sum % 10)) % 10;
    const check2 = (check1 * 3 + 7) % 10;
    return `${check1}${check2}`;
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
