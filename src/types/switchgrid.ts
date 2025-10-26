// Types pour l'API Switchgrid basés sur la spécification OpenAPI

export interface SwitchgridConfig {
  apiKey: string;
  baseUrl: string;
}

export interface ElectricityContract {
  id: string;
  prm: string;
  categorieClientFinalCode: 'RES' | 'PRO';
  nomClientFinalOuDenominationSociale: string;
  adresseInstallationNormalisee: {
    ligne1?: string;
    ligne2?: string;
    ligne3?: string;
    ligne4?: string;
    ligne5?: string;
    ligne6: string;
    ligne7?: string;
  };
}

export interface SearchContractParams {
  name?: string;
  address?: string;
  prm?: string;
}

export interface SearchContractResponse {
  results: ElectricityContract[];
}

export interface PersonnePhysique {
  genre: 'M' | 'F';
  firstName: string;
  lastName: string;
}

export interface AskSigner {
  genre?: 'M' | 'F';
  lastName?: string;
  firstName?: string;
  organizationName?: string;
  email?: string;
  phone?: string;
}

export interface CreateAskRequest {
  electricityContracts: string[]; // contract IDs
  signer?: AskSigner;
  consentCollectionMedium?: {
    service: 'DOCUSEAL' | 'WEB_HOSTED';
    redirectTo?: string;
    variant?: string;
    background?: string;
    base?: string;
    primary?: string;
    secondary?: string;
    error?: string;
  };
  scopes?: SwitchgridScope[];
  purposes?: SwitchgridPurpose[];
  consentDuration?: string;
  thirdPartyRecipients?: string[];
}

export interface SwitchgridScope {
  service?: 'ENEDIS_RAW_API';
  id: 'DETAILS_CONTRACTUELS' | 'CONSUMPTION_DATA' | 'ELECTRICITY_TIMESERIES';
  args?: {
    types?: readonly ('CDC' | 'PMAX' | 'IDX' | 'ENERGIE' | 'LOADCURVE')[];
    directions?: readonly ('SOUTIRAGE' | 'INJECTION')[];
  };
}

export type SwitchgridPurpose = 
  | 'SOLAR_INSTALLATION_SIZING'
  | 'DEMAND_RESPONSE'
  | 'ENERGY_PERFORMANCE_STUDY'
  | 'ENERGY_BROKERAGE'
  | 'VEHICLE_CHARGE_DETECTION';

export type AskStatus = 
  | 'CREATED'
  | 'PENDING_ADDRESS_CHECK'
  | 'ADDRESS_CHECK_FAILED'
  | 'PREPARING_CONSENT_COLLECTION'
  | 'PENDING_USER_ACTION'
  | 'ACCEPTED';

export interface Ask {
  id: string;
  createdAt: string;
  status: AskStatus;
  acceptedAt?: string | null;
  consentCollectionDetails?: {
    service: 'DOCUSEAL' | 'WEB_HOSTED';
    userUrl: string;
    redirectTo?: string;
  } | null;
  createArgs: CreateAskRequest;
  addressCheckResults: Record<string, { status: 'SUCCESS' | 'FAILURE' }>;
  consentIds: Record<string, string>;
  contracts: ElectricityContract[];
  scopes: SwitchgridScope[];
  purposes: SwitchgridPurpose[];
  testEnvironment: boolean;
  thirdPartyRecipients: string[];
}

export interface OrderRequest {
  consentId?: string;
  requests: DataRequest[];
}

export interface DataRequest {
  type: 'C68' | 'C68_ASYNC' | 'R63' | 'R63_SYNC' | 'R64' | 'R64_SYNC' | 'R65' | 'R65_SYNC' | 'R66' | 'R66_SYNC' | 'R67' | 'LOADCURVE';
  direction?: 'SOUTIRAGE' | 'INJECTION' | 'CONSUMPTION' | 'PRODUCTION';
  since?: string;
  until?: string;
  prms?: string[];
  enedisCorrection?: boolean;
  enedisRetryAfterLoadcurveActivation?: boolean;
}

export type OrderStatus = 
  | 'CREATED'
  | 'PENDING_ADDRESS_CHECK'
  | 'ADDRESS_CHECK_FAILED'
  | 'PENDING_REQUESTS'
  | 'SOME_REQUESTS_FAILED'
  | 'SUCCESS';

export type RequestStatus = 
  | 'NOT_STARTED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING_ADDRESS_CHECK';

export interface OrderResponse {
  id: string;
  status: OrderStatus;
  requests: {
    id: string;
    type: string;
    status: RequestStatus;
    orderedAt: string | null;
    completedAt: string | null;
    dataUrl?: string | null;
    errorMessage?: string | null;
    requestedTimeRange?: string | null;
    summaryPerContract?: {
      prm: string;
      timeRangeCoverageRatio: number;
      holes: string[];
      errorMessage: string | null;
    }[];
    loadCurve?: {
      period: string;
      startsAt: string;
      endsAt: string;
      values: (number | null)[];
    } | null;
  }[];
}

export interface SwitchgridError {
  error?: string;
  message?: string;
  issues?: {
    _tag: string;
    path: (string | number)[];
    message: string;
  }[];
}