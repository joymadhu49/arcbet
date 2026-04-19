export const MARKET_FACTORY_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_usdc",  type: "address" },
      { internalType: "address", name: "_owner", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "string",  name: "question",       type: "string" },
      { internalType: "string",  name: "description",    type: "string" },
      { internalType: "string",  name: "category",       type: "string" },
      { internalType: "string",  name: "imageUrl",       type: "string" },
      { internalType: "uint256", name: "resolutionTime", type: "uint256" },
    ],
    name: "createMarket",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "bool",    name: "yesWon", type: "bool" },
    ],
    name: "resolveMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "market", type: "address" }],
    name: "cancelMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllMarkets",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMarketCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const PREDICTION_MARKET_ABI = [
  {
    inputs: [
      { internalType: "bool",    name: "isYes",  type: "bool" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimWinnings",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getMarket",
    outputs: [
      {
        components: [
          { internalType: "string",  name: "question",       type: "string" },
          { internalType: "string",  name: "description",    type: "string" },
          { internalType: "string",  name: "category",       type: "string" },
          { internalType: "string",  name: "imageUrl",       type: "string" },
          { internalType: "uint256", name: "resolutionTime", type: "uint256" },
          { internalType: "uint256", name: "totalYes",       type: "uint256" },
          { internalType: "uint256", name: "totalNo",        type: "uint256" },
          { internalType: "uint8",   name: "outcome",        type: "uint8" },
          { internalType: "bool",    name: "resolved",       type: "bool" },
        ],
        internalType: "struct PredictionMarket.Market",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserShares",
    outputs: [
      { internalType: "uint256", name: "yes", type: "uint256" },
      { internalType: "uint256", name: "no",  type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "previewPayout",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "yesOdds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "noOdds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalPool",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "claimed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount",  type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner",   type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
