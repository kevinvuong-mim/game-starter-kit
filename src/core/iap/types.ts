export interface IapProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  type: 'consumable' | 'non_consumable' | 'subscription';
}

export interface IapPurchase {
  productId: string;
  transactionId: string;
  receipt: string;
  purchaseTime: number;
}

export interface IapVerifyResult {
  valid: boolean;
  productId: string;
  transactionId: string;
}

export interface IIapProvider {
  readonly name: string;
  init(): Promise<void>;
  getProducts(): Promise<IapProduct[]>;
  purchase(productId: string): Promise<IapPurchase>;
  restore(): Promise<IapPurchase[]>;
  verify(receipt: string): Promise<IapVerifyResult>;
  consume(transactionId: string): Promise<void>;
}
