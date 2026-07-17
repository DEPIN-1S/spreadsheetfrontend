import { test, expect } from '@playwright/test';

test.describe('E2E Inventory Session Test', () => {
    test.beforeEach(async ({ page }) => {
        // Log browser messages and errors
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
        
        // Log network requests and responses
        page.on('request', request => console.log('>>', request.method(), request.url()));
        page.on('response', async response => {
            console.log('<<', response.status(), response.url());
            if (response.url().includes('/api/')) {
                try {
                    const text = await response.text();
                    console.log('API RESPONSE BODY:', text.substring(0, 500));
                } catch (e) {}
            }
        });

        // 1. Navigate to application root
        await page.goto('/');

        // 2. Setup JWT credentials in local storage
        await page.evaluate(() => {
            localStorage.setItem('accessToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3Nzc3Nzc3LTc3NzctNzc3Ny03Nzc3LTc3Nzc3Nzc3Nzc3NyIsInJvbGUiOiJzdXBlcmFkbWluIiwiaWF0IjoxNzg0MTA0MjYyfQ.cUusROhmnxSd9MA6K5mJQvXP4JtCvT6VOWTpOPo6o4E');
            localStorage.setItem('user', JSON.stringify({
                id: '77777777-7777-7777-7777-777777777777',
                name: 'Super Admin',
                phone: '9999999999',
                role: 'superadmin'
            }));
        });

        // 3. Reload to apply token and route to my-files
        await page.reload();
    });

    test('should load folders, sheets, trigger detailed views, and load billing lists', async ({ page }) => {
        // Assert loaded My Files dashboard
        await expect(page.locator('button:has-text("My Files")').first()).toBeVisible();

        // A. Click Inventory sidebar group
        const inventorySidebar = page.locator('button:has-text("Inventory")');
        await expect(inventorySidebar).toBeVisible();
        await inventorySidebar.click();

        // B. Click Inventory files sub-link
        const inventoryFilesLink = page.locator('button:has-text("Inventory files")');
        await expect(inventoryFilesLink).toBeVisible();
        await inventoryFilesLink.click();

        // C. Verify seeded folder and file
        const folderCard = page.locator('text=Main Warehouse Stock');
        await expect(folderCard).toBeVisible();

        // Click folder to open it (single-click opens folder in RetailInventory.jsx)
        await folderCard.click();

        // D. Verify file is visible inside the folder
        const fileCard = page.locator('text=Warehouse A Stocklist');
        await expect(fileCard).toBeVisible();

        // Click sheet card to open the document editor
        await fileCard.click();
        await expect(page.locator('text=Warehouse A Stocklist').first()).toBeVisible();

        // E. Verify first row product is 'Limcee Chewable Vitamin C'
        const limceeTextarea = page.locator('tbody tr').first().locator('td').nth(2).locator('textarea');
        await expect(limceeTextarea).toHaveValue('Limcee Chewable Vitamin C');

        // Verify second row product is 'Dolo 650mg Tablet'
        const doloTextarea = page.locator('tbody tr').nth(1).locator('td').nth(2).locator('textarea');
        await expect(doloTextarea).toHaveValue('Dolo 650mg Tablet');

        // Click 'Open Details' button indicator in bottom right corner of Dolo's inventory cell
        const openDetailsButton = page.locator('[title="Open Details"]').nth(1);
        await expect(openDetailsButton).toBeVisible();
        await openDetailsButton.click();

        // F. Sub-sheet details overlay loads
        const subSheetHeader = page.locator('text=Sub-Spreadsheet View');
        await expect(subSheetHeader).toBeVisible();

        // Verify seeded batch DL2026A is present in the sub-sheet (second match is the visible textarea)
        const batchCell = page.locator('text=DL2026A').nth(1);
        await expect(batchCell).toBeVisible();

        // Close sub-sheet
        const closeDetailsButton = page.locator('[title="Close Details"]');
        await expect(closeDetailsButton).toBeVisible();
        await closeDetailsButton.click();

        // G. Go back to Inventory dashboard to make sidebar visible
        const backButton = page.locator('button[title="Back"]');
        await expect(backButton).toBeVisible();
        await backButton.click();

        // Go to RT Billing
        const rtBillingLink = page.locator('button:has-text("RT Billing")');
        await expect(rtBillingLink).toBeVisible();
        await rtBillingLink.click();

        // H. Verify retail customer directory is loaded from backend
        const customerTableTitle = page.locator('text=Retail Customers / Parties');
        await expect(customerTableTitle).toBeVisible();
    });

    test('should edit invoice quantity, verify stock decrement, then delete invoice and verify stock restock', async ({ page }) => {
        // 1. Go to RT Billing
        const inventorySidebar = page.locator('button:has-text("Inventory")');
        await expect(inventorySidebar).toBeVisible();
        await inventorySidebar.click();
        
        const rtBillingLink = page.locator('button:has-text("RT Billing")');
        await expect(rtBillingLink).toBeVisible();
        await rtBillingLink.click();

        // 2. Locate INV-RET-2026-001 Edit button
        const invoiceRow = page.locator('tr:has-text("INV-RET-2026-001")');
        await expect(invoiceRow).toBeVisible();
        const editButton = invoiceRow.locator('[title="Edit Invoice"]');
        await expect(editButton).toBeVisible();
        await editButton.click();

        // 3. Verify Edit Invoice page loaded
        await expect(page.locator('text=Edit Retail Bill / Invoice')).toBeVisible();

        // 4. Update quantity of Limcee Chewable Vitamin C
        const limceeItemRow = page.locator('tr:has-text("Limcee Chewable Vitamin C")');
        const qtyInput = limceeItemRow.locator('input[type="number"]');
        await qtyInput.fill('2');

        // 5. Update & Save Invoice
        const submitButton = page.locator('button:has-text("Update & Save Invoice")');
        await expect(submitButton).toBeVisible();
        await submitButton.click();

        // 6. Wait for redirect
        await expect(page.locator('text=Retail Invoice Updated Successfully!')).toBeVisible();
        await page.waitForTimeout(2000);

        // 7. Go to Inventory Files and check sheet inventory column
        const inventoryFilesLink = page.locator('button:has-text("Inventory files")');
        await expect(inventoryFilesLink).toBeVisible();
        await inventoryFilesLink.click();

        const folderCard = page.locator('text=Main Warehouse Stock');
        await expect(folderCard).toBeVisible();
        await folderCard.click();

        const fileCard = page.locator('text=Warehouse A Stocklist');
        await expect(fileCard).toBeVisible();
        await fileCard.click();

        // Limcee is Row 1 (orderIndex 0), the inventory cell is column 4 (col-retail-inventory, index 4 in cells)
        const limceeStock = page.locator('tbody tr').first().locator('td').nth(4).locator('textarea');
        await expect(limceeStock).toHaveValue('3');

        // 8. Go back to RT Billing
        const backButton = page.locator('button[title="Back"]');
        await expect(backButton).toBeVisible();
        await backButton.click();

        await rtBillingLink.click();

        // 9. Click Delete button on INV-RET-2026-001
        page.once('dialog', dialog => dialog.accept());
        const deleteButton = page.locator('tr:has-text("INV-RET-2026-001")').locator('[title="Delete Invoice"]');
        await expect(deleteButton).toBeVisible();
        await deleteButton.click();

        // 10. Verify invoice is deleted
        await expect(page.locator('tr:has-text("INV-RET-2026-001")')).not.toBeVisible();

        // 11. Go back to Warehouse A Stocklist and verify Limcee inventory is fully restored to 5
        await inventoryFilesLink.click();
        await folderCard.click();
        await fileCard.click();

        const limceeStockRestored = page.locator('tbody tr').first().locator('td').nth(4).locator('textarea');
        await expect(limceeStockRestored).toHaveValue('5');
    });
});
