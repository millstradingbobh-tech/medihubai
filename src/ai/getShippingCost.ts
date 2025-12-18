
export interface ShippingCostParams {
  sku: string;
  postcode: string;
  qty?: number;
}

export interface ShippingData {
  postage?: number;
  zoom2UShipping?: {
    internal_label: string;
    label: string;
    cost: number;
  };
  // Add other fields as needed based on API response
}

export async function getShippingCost(params: ShippingCostParams): Promise<ShippingData> {
  const { sku, postcode, qty = 1 } = params;
  const url = `https://api.millsbrands.com.au/api/v1/postage-calculator` +
              `?sku=${encodeURIComponent(sku)}` +
              `&zip=${encodeURIComponent(postcode)}` +
              `&qty=${qty}` +
              `&services=all`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Shipping API error: ${response.statusText}`);
  }

  const data: ShippingData = await response.json();


      console.log('getShippingCostgetShippingCostgetShippingCost', data)

  return data;
}