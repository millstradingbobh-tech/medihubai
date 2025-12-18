import { SENITY_PROJECT_ID, SENITY_DATASET, SENITY_API_VERSION, SENITY_TOKEN } from './access';
import Logger from '../utils/logging';

const projectId = SENITY_PROJECT_ID;   // e.g. abc123
const dataset = SENITY_DATASET;          // or your dataset name
const token = SENITY_TOKEN;
const dataVersion = 'v' + SENITY_API_VERSION;

export async function getProduct(productId: string) {
    const query = `


       *[_type == "product" && _id match "*${productId}*"]{
        ...,
            "variants": *[
                _type == "productVariant" &&
                store.productId == ^.store.id
            ]
        }[0]
    `;
    const encodedQuery = encodeURIComponent(query);

    const url = `https://${projectId}.api.sanity.io/${dataVersion}/data/query/${dataset}?query=${encodedQuery}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    console.log(data)
    return data;
}

export const getProductById = async (req: any) => {
  return await getProduct(req.body.productId);
}