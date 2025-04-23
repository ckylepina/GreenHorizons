// app/sales/new/new-sale-scan/utils/validateSale.ts
import type { NewSaleData } from '../hooks/useNewSale';

export function validateSale(data: NewSaleData): string[] {
  const errors: string[] = [];

  if (data.mode === 'existing' && !data.selectedCustomer) {
    errors.push('Please select an existing customer.');
  }
  if (data.mode === 'new') {
    const { first_name, last_name, email, drivers_license } = data.newCustomer;
    if (!first_name || !last_name || !email || !drivers_license) {
      errors.push('All new‐customer fields must be filled.');
    }
  }
  if (data.scannedBags.length === 0) {
    errors.push('Please scan at least one bag.');
  }
  if (data.saleTotal <= 0) {
    errors.push('Sale total must be greater than zero.');
  }
  if (!(data.signatureBlob instanceof Blob) || data.signatureBlob.size === 0) {
    errors.push('Please provide a signature.');
  }

  return errors;
}