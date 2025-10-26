export interface ClientInfo {
  typeClient: 'particulier' | 'professionnel';
  nom: string;
  prenom: string;
  denominationSociale?: string;
  nomRepresentant?: string;
  prenomRepresentant?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  assujettieATVA?: boolean;
}

export interface Address {
  rue: string;
  codePostal: string;
  ville: string;
  pays: string;
  region?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface ClientState {
  clientInfo: ClientInfo;
  address: Address;
}