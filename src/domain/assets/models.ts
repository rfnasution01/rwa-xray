export type RwaAssetType =
  | "stock"
  | "commodity"
  | "currency"
  | "government_security"
  | "etf"
  | "real_estate";

export type Currency = "USD";

export type AssetIdentity = {
  rwaId: number;
  name: string;
  symbol: string;
  slug: string;
  assetType: RwaAssetType;
  rank: number | null;
  hasTokens: boolean | null;
};

export type DiscoveryAsset = AssetIdentity & {
  firstHistoricalData: string | null;
  lastHistoricalData: string | null;
};

export type AssetMetadata = AssetIdentity & {
  website: string | null;
  employees: number | null;
  founded: string | null;
  industry: string | null;
  cik: string | null;
  primaryExchange: string | null;
  about: {
    description: string | null;
    logo: string | null;
    website: string | null;
    dateAdded: string | null;
  } | null;
};

export type AggregateQuote = {
  currency: Currency;
  averageTokenizedPrice: number | null;
  tokenizedMarketCap: number | null;
  tokenizedVolume24h: number | null;
  sourceUpdatedAt: string | null;
};

export type ListedAsset = AssetIdentity & {
  quote: AggregateQuote;
};

export type RwaToken = {
  cryptoId: number;
  name: string;
  symbol: string;
  issuerId: string | null;
  issuerName: string | null;
  currency: Currency;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
};

export type TradfiMarket = {
  exchangeId: number;
  exchangeName: string;
  exchangeSlug: string;
  ticker: string;
  marketUrl: string | null;
};

export type DetailedAsset = AssetIdentity & {
  quote: AggregateQuote;
  tokens: RwaToken[];
  tradfiMarkets: TradfiMarket[];
};

export type MarketPair = {
  marketId: number;
  marketPair: string;
  category: string;
  feeType: string | null;
  exchange: {
    id: number;
    name: string;
    slug: string;
  };
  base: {
    cryptoId: number | null;
    symbol: string;
    exchangeSymbol: string | null;
    currencyType: string | null;
  };
  quote: {
    cryptoId: number | null;
    symbol: string;
    exchangeSymbol: string | null;
    currencyType: string | null;
  };
  marketQuote: {
    currency: Currency;
    price: number | null;
    volume24h: number | null;
    sourceUpdatedAt: string | null;
  };
};

export type MarketPairs = {
  rwaId: number;
  name: string;
  symbol: string;
  reportedPairCount: number;
  pairs: MarketPair[];
  totalSize: number;
  hasMore: boolean;
};

export type IssuerSummary = {
  issuerId: string;
  name: string;
  website: string | null;
  logo: string | null;
  tokenCount: number | null;
};

export type IssuerToken = {
  cryptoId: number;
  rwaId: number | null;
  name: string;
  symbol: string;
};

export type IssuerDetail = IssuerSummary & {
  tokens: IssuerToken[];
  linkedTokenTotal: number | null;
  hasMore: boolean | null;
};

export type Page<T> = {
  items: T[];
  totalSize: number | null;
  hasMore: boolean | null;
};

export type NormalizationWarningCode =
  | "INVALID_ASSET_EXCLUDED"
  | "INVALID_TOKEN_EXCLUDED"
  | "INVALID_TIMESTAMP"
  | "USD_QUOTE_MISSING"
  | "PAGINATION_METADATA_MISSING";

export type NormalizationWarning = {
  code: NormalizationWarningCode;
  path: string;
  message: string;
};

export type CmcEndpoint =
  | "/v5/real-world-assets/map"
  | "/v5/real-world-assets/info"
  | "/v5/real-world-assets/assets/list"
  | "/v5/real-world-assets/market-pairs/list"
  | "/v5/real-world-assets/quotes/latest"
  | "/v5/real-world-assets/issuers/list"
  | "/v5/real-world-assets/issuers";

export type SourceEvidence = {
  provider: "coinmarketcap";
  endpoint: CmcEndpoint;
  responseTimestamp: string | null;
  observedAt: string;
  creditCount: number;
  notice: string | null;
};

export type NormalizedDataset<T> = {
  data: T;
  evidence: SourceEvidence;
  warnings: NormalizationWarning[];
};
