import { resolveDeployedBaseUrl } from "../../playwright.deployed.config";

export default function validateDeployedTarget(): void {
  resolveDeployedBaseUrl({
    UNCHANGED_DEPLOYED_URL: process.env.UNCHANGED_DEPLOYED_URL,
  });
}
