import * as fs from "fs";
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as os from "os";

interface IHashiServerOptions {
    imageUrl: string, 
    machineType: string, 
    networkLink: string | pulumi.Output<string>,
    targetSize: number,
    networkTier?: string,
    description?: string,
    labels?: pulumi.Input<{[key: string]: pulumi.Input<string>}>,
    serviceAccountName?: string,
    tags?: Array<string>,
}

export default class HashiServer extends pulumi.ComponentResource {
    constructor(name: string, options: IHashiServerOptions) {
        super("c9s:component:HashiServer", name);
        options = { 
            networkTier: "STANDARD",
            description: "Created by Pulumi",
            labels: {},
            serviceAccountName: "c9s-bot",
            tags: ["allow-icmp", "consul-join"], 
            ...options 
        };

        const instanceTemplate = this.instanceTemplate(options);
        const instanceGroupManager = this.instanceGroupManager(instanceTemplate.selfLink, options.targetSize);
    }

    instanceTemplate(options: IHashiServerOptions): gcp.compute.InstanceTemplate {
        return new gcp.compute.InstanceTemplate("server", {
            disks: [{
                autoDelete: true,
                boot: true,
                sourceImage: options.imageUrl,
            }],
            instanceDescription: options.description,
            labels: options.labels,
            machineType: options.machineType,
            metadataStartupScript: fs.readFileSync(`${__dirname}/files/startup.sh`, "utf-8"),
            networkInterfaces: [{
                network: options.networkLink,
            }],
            serviceAccount: {
                email: `${options.serviceAccountName}@assetstore.iam.gserviceaccount.com`,
                scopes: ["compute-ro"],
            },
            tags: options.tags,
        }, { parent: this }); 
    };

    instanceGroupManager(instanceTemplateLink: string | pulumi.Output<string>, targetSize: number) { 
        return new gcp.compute.InstanceGroupManager("server-group-manager", {
            baseInstanceName: "server",
            versions: [{
                instanceTemplate: instanceTemplateLink,
                name: "live"
            }],
            targetSize: targetSize,
        }, { parent: this });
    }
}