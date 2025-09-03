/**
 * Dropbox Integration for Arkansas Contract Agent
 * Provides redundant cloud backup alongside Google Drive
 */

import { Dropbox, files } from 'dropbox';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export class DropboxIntegration {
  private dbx: Dropbox | null = null;
  private basePath: string;
  private initialized: boolean = false;
  
  constructor() {
    this.basePath = process.env.DROPBOX_FOLDER_PATH || '/Arkansas Contract Agent';
  }
  
  /**
   * Initialize Dropbox client and create base folders
   */
  async initialize(): Promise<boolean> {
    try {
      const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
      
      if (!accessToken) {
        console.log('⚠️  Dropbox access token not configured - skipping Dropbox integration');
        return false;
      }
      
      this.dbx = new Dropbox({ accessToken });
      
      // Test connection and create base folders
      await this.ensureFolder(this.basePath);
      await this.ensureFolder(`${this.basePath}/Net Sheets`);
      await this.ensureFolder(`${this.basePath}/Agent Info Sheets`);
      await this.ensureFolder(`${this.basePath}/Contracts`);
      
      this.initialized = true;
      console.log('✅ Dropbox integration initialized');
      return true;
      
    } catch (error: any) {
      console.error('❌ Failed to initialize Dropbox:', error?.message || error);
      return false;
    }
  }
  
  /**
   * Ensure a folder exists in Dropbox
   */
  private async ensureFolder(folderPath: string): Promise<void> {
    if (!this.dbx) return;
    
    try {
      await this.dbx.filesCreateFolderV2({ path: folderPath });
      console.log(`📁 Created Dropbox folder: ${folderPath}`);
    } catch (error: any) {
      // Check if error is because folder already exists
      if (error?.error?.error_summary?.includes('path/conflict/folder')) {
        // Folder already exists, that's fine
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }
  
  /**
   * Upload a file to Dropbox and return shareable link
   */
  async uploadFile(localPath: string, dropboxPath: string): Promise<string | null> {
    if (!this.dbx || !this.initialized) {
      console.warn('⚠️  Dropbox not initialized');
      return null;
    }
    
    try {
      // Read file content
      const fileContent = await fs.promises.readFile(localPath);
      
      // Upload file
      const uploadResult = await this.dbx.filesUpload({
        path: dropboxPath,
        contents: fileContent,
        mode: { '.tag': 'overwrite' },
        autorename: true
      });
      
      // Create shareable link
      try {
        const linkResult = await this.dbx.sharingCreateSharedLinkWithSettings({
          path: uploadResult.result.path_display!,
          settings: {
            requested_visibility: { '.tag': 'public' },
            audience: { '.tag': 'public' }
          }
        });
        
        return linkResult.result.url;
        
      } catch (linkError: any) {
        // If link already exists, get existing link
        if (linkError?.error?.error_summary?.includes('shared_link_already_exists')) {
          const existingLinks = await this.dbx.sharingListSharedLinks({
            path: uploadResult.result.path_display!,
            direct_only: true
          });
          
          if (existingLinks.result.links.length > 0) {
            return existingLinks.result.links[0].url;
          }
        }
        throw linkError;
      }
      
    } catch (error: any) {
      console.error(`❌ Failed to upload to Dropbox: ${error?.message || error}`);
      return null;
    }
  }
  
  /**
   * Upload net sheet and agent info files to Dropbox
   */
  async uploadContractFiles(
    netSheetPdfPath?: string, 
    agentInfoPath?: string
  ): Promise<{ netSheetLink?: string; agentInfoLink?: string }> {
    const results: { netSheetLink?: string; agentInfoLink?: string } = {};
    
    if (!this.initialized) {
      return results;
    }
    
    // Upload net sheet PDF
    if (netSheetPdfPath && fs.existsSync(netSheetPdfPath)) {
      try {
        const fileName = path.basename(netSheetPdfPath);
        const dropboxPath = `${this.basePath}/Net Sheets/${fileName}`;
        
        const link = await this.uploadFile(netSheetPdfPath, dropboxPath);
        if (link) {
          results.netSheetLink = link;
          console.log(`   📎 Dropbox Net Sheet: ${link}`);
        }
      } catch (error) {
        console.error('⚠️  Failed to upload net sheet to Dropbox:', error);
      }
    }
    
    // Upload agent info sheet
    if (agentInfoPath && fs.existsSync(agentInfoPath)) {
      try {
        const fileName = path.basename(agentInfoPath);
        const dropboxPath = `${this.basePath}/Agent Info Sheets/${fileName}`;
        
        const link = await this.uploadFile(agentInfoPath, dropboxPath);
        if (link) {
          results.agentInfoLink = link;
          console.log(`   📎 Dropbox Agent Info: ${link}`);
        }
      } catch (error) {
        console.error('⚠️  Failed to upload agent info to Dropbox:', error);
      }
    }
    
    return results;
  }
  
  /**
   * Check if Dropbox is configured and ready
   */
  isConfigured(): boolean {
    return !!process.env.DROPBOX_ACCESS_TOKEN;
  }
  
  /**
   * Check if Dropbox is initialized and ready for uploads
   */
  isReady(): boolean {
    return this.initialized && !!this.dbx;
  }
}

export default DropboxIntegration;