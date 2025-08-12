/**
 * Arkansas Real Estate Contract Schema
 * Based on standard Arkansas real estate purchase agreements
 */

export interface ArkansasRealEstateContract {
  // Transaction Parties
  parties: {
    buyers: Party[];
    sellers: Party[];
    listingAgent?: Agent;
    sellingAgent?: Agent;
    listingBroker?: Broker;
    sellingBroker?: Broker;
  };

  // Property Information
  property: {
    address: Address;
    legalDescription: string;
    parcelNumber?: string;
    propertyType: PropertyType;
    yearBuilt?: number;
    squareFootage?: number;
    lotSize?: string;
    subdivision?: string;
  };

  // Financial Terms
  financial: {
    purchasePrice: number;
    earnestMoney: {
      amount: number;
      depositDate: string;
      heldBy: string;
    };
    financing: {
      type: FinancingType;
      loanAmount?: number;
      downPayment?: number;
      interestRate?: number;
      loanType?: string;
      appraisalContingency?: boolean;
    };
    closingCosts: {
      buyerPays?: string[];
      sellerPays?: string[];
    };
  };

  // Important Dates
  dates: {
    contractDate: string;
    closingDate: string;
    possessionDate: string;
    inspectionDeadline?: string;
    financingDeadline?: string;
    appraisalDeadline?: string;
  };

  // Contingencies
  contingencies: {
    inspection: {
      required: boolean;
      deadline?: string;
      inspectionPeriodDays?: number;
    };
    financing: {
      required: boolean;
      deadline?: string;
      loanType?: string;
    };
    appraisal: {
      required: boolean;
      minimumValue?: number;
    };
    saleOfBuyerProperty?: {
      required: boolean;
      propertyAddress?: string;
      deadline?: string;
    };
  };

  // Included/Excluded Items
  inclusions: {
    fixtures: string[];
    appliances: string[];
    personalProperty?: string[];
    exclusions?: string[];
  };

  // Disclosures
  disclosures: {
    propertyDisclosure?: boolean;
    leadBasedPaint?: boolean;
    homeWarranty?: {
      included: boolean;
      company?: string;
      cost?: number;
      paidBy?: 'buyer' | 'seller';
    };
  };

  // Additional Terms
  additionalTerms: {
    specialStipulations?: string[];
    repairsRequired?: string[];
    sellerConcessions?: number;
    homeOwnerAssociation?: {
      exists: boolean;
      monthlyDues?: number;
      transferFee?: number;
    };
  };

  // Contract Metadata
  metadata: {
    contractId?: string;
    mlsNumber?: string;
    extractionDate: string;
    extractionConfidence: number;
    documentPages: number;
    extractedFields: string[];
    missingFields: string[];
  };
}

export interface Party {
  name: string;
  type: 'individual' | 'entity';
  address?: Address;
  phone?: string;
  email?: string;
  signature?: boolean;
  signatureDate?: string;
}

export interface Agent {
  name: string;
  licenseNumber: string;
  phone?: string;
  email?: string;
  brokerageName?: string;
}

export interface Broker {
  name: string;
  licenseNumber?: string;
  address?: Address;
  phone?: string;
}

export interface Address {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
}

export type PropertyType = 
  | 'single-family'
  | 'condo'
  | 'townhouse'
  | 'multi-family'
  | 'land'
  | 'commercial'
  | 'farm'
  | 'other';

export type FinancingType = 
  | 'cash'
  | 'conventional'
  | 'fha'
  | 'va'
  | 'usda'
  | 'seller-financing'
  | 'assumption'
  | 'other';

// Validation rules specific to Arkansas
export const ArkansasContractValidation = {
  earnestMoney: {
    minimumAmount: 100,
    typicalPercentage: 0.01, // 1% of purchase price
    mustBeHeldInTrust: true
  },
  inspectionPeriod: {
    defaultDays: 10,
    maximumDays: 30
  },
  closingPeriod: {
    minimumDays: 15,
    typicalDays: 30,
    maximumDays: 90
  },
  requiredDisclosures: [
    'property-condition',
    'lead-based-paint' // for homes built before 1978
  ]
};