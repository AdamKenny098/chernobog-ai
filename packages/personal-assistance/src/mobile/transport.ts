export interface PersonalAssistanceMobileTransportPolicy {
  mode: "tailnet-only";
  applicationAuthentication: "device-bearer";
  tlsRequired: true;
  directInternetExposureSupported: false;
  sourceNetworkAssertion: "not-inferred-by-application";
}

export function getPersonalAssistanceMobileTransportPolicy():
  PersonalAssistanceMobileTransportPolicy {
  return {
    mode: "tailnet-only",
    applicationAuthentication: "device-bearer",
    tlsRequired: true,
    directInternetExposureSupported: false,
    sourceNetworkAssertion:
      "not-inferred-by-application",
  };
}