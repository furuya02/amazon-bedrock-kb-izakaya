import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { aws_iam, aws_s3, aws_bedrock } from "aws-cdk-lib";

export class AmazonBedrockKbIzakayaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tag = "kb-izakaya";
    const bucketName = `${tag}-${this.account}`;
    const embeddingModelArn = this.node.tryGetContext("embeddingModelArn");
    const pineconeEndpoint = this.node.tryGetContext("pineconeEndpoint");
    const pineconeSecretArn = this.node.tryGetContext("pineconeSecretArn");

    // S3 bucket for the data source
    const dataSourceBucket = new aws_s3.Bucket(this, "DataSourceBucket", {
      bucketName: bucketName,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Role for the knowledge base
    const knowledgeBaseRole = new aws_iam.Role(this, `KnowledgeBaseRole`, {
      roleName: `${tag}_role`,
      assumedBy: new aws_iam.ServicePrincipal("bedrock.amazonaws.com"),
      inlinePolicies: {
        inlinePolicy1: new aws_iam.PolicyDocument({
          statements: [
            new aws_iam.PolicyStatement({
              resources: [pineconeSecretArn],
              actions: ["secretsmanager:GetSecretValue"],
            }),
            new aws_iam.PolicyStatement({
              resources: [embeddingModelArn],
              actions: ["bedrock:InvokeModel"],
            }),
            new aws_iam.PolicyStatement({
              resources: [
                `arn:aws:s3:::${bucketName}`,
                `arn:aws:s3:::${bucketName}/*`,
              ],
              actions: ["s3:ListBucket", "s3:GetObject"],
            }),
          ],
        }),
      },
    });

    // knowledge Base
    const knowledgeBase = new aws_bedrock.CfnKnowledgeBase(
      this,
      "KnowledgeBase",
      {
        knowledgeBaseConfiguration: {
          type: "VECTOR",
          vectorKnowledgeBaseConfiguration: {
            embeddingModelArn: embeddingModelArn,
          },
        },
        name: tag,
        roleArn: knowledgeBaseRole.roleArn,
        storageConfiguration: {
          type: "PINECONE",
          pineconeConfiguration: {
            connectionString: pineconeEndpoint,
            credentialsSecretArn: pineconeSecretArn,
            fieldMapping: {
              metadataField: "metadata",
              textField: "text",
            },
          },
        },
        description: "IZAKAYA knowledge base",
      }
    );

    // data source
    new aws_bedrock.CfnDataSource(this, "BedrockKnowledgeBaseDataStore", {
      name: `${tag}-data-source`,
      knowledgeBaseId: knowledgeBase.ref,
      dataSourceConfiguration: {
        s3Configuration: {
          bucketArn: dataSourceBucket.bucketArn,
        },
        type: "S3",
      },
    });

    // Output the AWS CLI command to upload a file to the S3 bucket
    const dataSourceFiles: string[] = [
      "izakaya_menu.txt",
      "izakaya_guidance.pdf",
    ];
    dataSourceFiles.forEach((dataSourceFile) => {
      const uploadCommand = `aws s3 cp assets/${dataSourceFile} s3://${bucketName}/${dataSourceFile}`;
      new CfnOutput(this, `UploadCommand_${dataSourceFile}`, {
        value: uploadCommand,
        description: `AWS CLI command to upload a file to the S3 bucket`,
      });
    });
  }
}
