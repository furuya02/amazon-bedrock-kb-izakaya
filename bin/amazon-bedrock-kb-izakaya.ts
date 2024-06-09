#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AmazonBedrockKbIzakayaStack } from "../lib/amazon-bedrock-kb-izakaya-stack";

const app = new cdk.App();
new AmazonBedrockKbIzakayaStack(app, "KnowledgeBaseIzakayaStack", {});
