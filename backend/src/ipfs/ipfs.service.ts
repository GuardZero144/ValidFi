import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create } from 'ipfs-http-client';
import { Readable } from 'stream';

@Injectable()
export class IpfsService {
  private ipfs: any;

  constructor(private readonly configService: ConfigService) {
    const pinataKey = this.configService.get<string>('PINATA_API_KEY');
    const pinataSecret = this.configService.get<string>('PINATA_API_SECRET');
    
    if (pinataKey && pinataSecret) {
      this.ipfs = create({
        host: 'api.pinata.cloud',
        port: 443,
        protocol: 'https',
        headers: {
          authorization: `Bearer ${pinataKey}:${pinataSecret}`,
        },
      });
    }
  }

  async uploadFile(file: Buffer | Readable, fileName: string): Promise<string> {
    try {
      const result = await this.ipfs.add(file, {
        pinataMetadata: {
          name: fileName,
        },
      });
      return result.cid.toString();
    } catch (error) {
      throw new Error(`Failed to upload file to IPFS: ${error.message}`);
    }
  }

  async uploadJSON(data: any, fileName: string): Promise<string> {
    try {
      const result = await this.ipfs.add(JSON.stringify(data), {
        pinataMetadata: {
          name: fileName,
        },
      });
      return result.cid.toString();
    } catch (error) {
      throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
    }
  }

  async getFile(cid: string): Promise<any> {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to retrieve file from IPFS: ${error.message}`);
    }
  }

  getGatewayUrl(cid: string): string {
    const gateway = this.configService.get<string>('PINATA_GATEWAY') || 'https://gateway.pinata.cloud/ipfs/';
    return `${gateway}${cid}`;
  }
}
