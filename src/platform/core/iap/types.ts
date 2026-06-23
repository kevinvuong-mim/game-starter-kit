export interface IapProduct {
  id: string;
  price: string;
  title: string;
  currency: string;
  description: string;
  priceAmount: number;
  type: 'consumable' | 'subscription' | 'non_consumable';
}

export interface IapPurchase {
  receipt: string;
  productId: string;
  purchaseTime: number;
  transactionId: string;
}

export interface IapVerifyResult {
  valid: boolean;
  productId: string;
  transactionId: string;
}

export interface IIapProvider {
  readonly name: string;
  init(): Promise<void>;
  restore(): Promise<IapPurchase[]>;
  getProducts(): Promise<IapProduct[]>;
  consume(transactionId: string): Promise<void>;
  purchase(productId: string): Promise<IapPurchase>;
  verify(receipt: string): Promise<IapVerifyResult>;
}
