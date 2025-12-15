import axios from "axios";
import { MAGENTO_BASE_URL, MAGENTO_TOKEN } from './access';

export interface MagentoProduct {
  id: number;
  sku: string;
  name: string;
  price: number;
  status: number;
  type_id: string;
  attribute_set_id: number;
  extension_attributes?: any;
  custom_attributes?: Array<{ attribute_code: string; value: string }>;
}

interface MagentoSearchResponse {
  items: MagentoProduct[];
  total_count: number;
}

/**
 * Get product by entity_id (numeric).
 */
export async function getMagentoProductById(req: any): Promise<MagentoProduct | null> {
    const productId = req.body.productId;

    console.log('productIdproductId', req)
    const params = {
        "searchCriteria[filter_groups][0][filters][0][field]": "entity_id",
        "searchCriteria[filter_groups][0][filters][0][value]": productId,
        "searchCriteria[filter_groups][0][filters][0][condition_type]": "eq",
    };

    const axiosClient = axios.create({
    baseURL: MAGENTO_BASE_URL,
    headers: {
        Authorization: `Bearer ${MAGENTO_TOKEN}`,
        "Content-Type": "application/json",
    },
    });


  const response = await axiosClient.get<MagentoSearchResponse>("/products", { params });

  return response.data.items.length > 0 ? response.data.items[0] : null;
}

