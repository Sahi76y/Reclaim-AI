export interface PolicyConfig {
  maxAutomatedRecoveryAmountINR: number;
  maxAutomatedRetries: number;
  maxRecoveryInterventions: number;
  minimumConfidenceForAutomation: number;
  minimumConfidenceForConservativeEvaluation: number;
  blockCriticalAutomation: boolean;
  blockNonRecoverable: boolean;
  policyVersion: string;
}

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  maxAutomatedRecoveryAmountINR: 25000,
  maxAutomatedRetries: 2,
  maxRecoveryInterventions: 2,
  minimumConfidenceForAutomation: 0.8,
  minimumConfidenceForConservativeEvaluation: 0.6,
  blockCriticalAutomation: true,
  blockNonRecoverable: true,
  policyVersion: "1.0.0",
};

/**
 * Returns merged policy config with defaults.
 */
export function getPolicyConfig(overrides?: Partial<PolicyConfig>): PolicyConfig {
  return {
    ...DEFAULT_POLICY_CONFIG,
    ...(overrides ?? {}),
  };
}
