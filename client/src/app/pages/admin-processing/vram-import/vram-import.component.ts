/*
!##########################################################################
! CRANE PLAN OF ACTION AND MILESTONE AUTOMATION TOOL (C-PAT) SOFTWARE
! Use is governed by the Open Source Academic Research License Agreement
! contained in the LICENSE.MD file, which is part of this software package.
! BY USING OR MODIFYING THIS SOFTWARE, YOU ARE AGREEING TO THE TERMS AND 
! CONDITIONS OF THE LICENSE.  
!##########################################################################
*/

import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { HttpResponse } from '@angular/common/http';
import { VRAMImportService } from './vram-import.service';
import { UsersService } from '../user-processing/users.service';
import { firstValueFrom } from 'rxjs';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { VramPopupComponent } from '../../../common/components/vram-popup/vram-popup.component';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'cpat-vram-import',
  templateUrl: './vram-import.component.html',
  styleUrls: ['./vram-import.component.scss'],
  standalone: true,
  imports: [
    BadgeModule,
    ButtonModule,
    CardModule,
    CommonModule,
    FileUploadModule,
    FormsModule,
    ProgressBarModule,
    ToastModule,
    VramPopupComponent,
  ],
  providers: [MessageService],
})
export class VRAMImportComponent implements OnInit {
  @ViewChild('fileUpload') fileUpload!: FileUpload;
  @Output() navigateToPluginMapping = new EventEmitter<void>();
  uploadUrl: string = '/api/import/vram';
  user: any;
  totalSize: string = '0';
  totalSizePercent: number = 0;
  vramUpdatedDate: string = '';

  constructor(
    private messageService: MessageService,
    private vramImportService: VRAMImportService,
    private userService: UsersService
  ) {}

  async ngOnInit() {
    try {
      this.user = await firstValueFrom(await this.userService.getCurrentUser());
    } catch (error) {
      console.error('Error fetching user data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch user data',
      });
    }
    this.getVramUpdatedDate();
  }

  async getVramUpdatedDate(): Promise<void> {
    (await this.vramImportService.getVramDataUpdatedDate()).subscribe({
      next: (response: any) => {
        if (response && response.value) {
          this.vramUpdatedDate = response.value;
        } else {
          this.vramUpdatedDate = 'N/A';
        }
      },
      error: error => {
        console.error('Error fetching VRAM updated date:', error);
        this.vramUpdatedDate = 'Error';
      },
    });
  }

  onUpload() {
    this.messageService.add({
      severity: 'info',
      summary: 'File Uploaded',
      detail: '',
    });
  }

  onSelect(event: any) {
    event.stopPropagation();
    this.updateTotalSize();
  }

  async customUploadHandler(event: any) {
    const file = event.files[0];
    if (!file) {
      console.error('No file selected');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No file selected',
      });
      return;
    }

    try {
      const upload$ = await this.vramImportService.upload(file);
      upload$.subscribe({
        next: (event: any) => {
          if (event instanceof HttpResponse) {
            if (
              event.body &&
              event.body.message === 'File is not newer than the last update. No changes made.'
            ) {
              this.messageService.add({
                severity: 'info',
                summary: 'Information',
                detail: event.body.message,
              });
            } else {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'File uploaded successfully',
              });
              setTimeout(() => this.navigateToPluginMapping.emit(), 1000);
            }
            this.fileUpload.clear();
          }
        },
        error: (error: any) => {
          console.error('Error during file upload:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'File upload failed: ' + (error.error?.message || 'Unknown error'),
          });
        },
        complete: () => {
          this.updateTotalSize();
        },
      });
    } catch (error) {
      console.error('Error initiating file upload:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to initiate file upload',
      });
    }
  }

  choose(event: Event, chooseCallback: Function) {
    event.stopPropagation();
    chooseCallback();
  }

  uploadEvent(uploadCallback: Function) {
    uploadCallback();
  }

  onRemoveFile(event: Event, file: File, removeCallback: Function) {
    event.stopPropagation();
    removeCallback(file);
    this.updateTotalSize();
  }

  updateTotalSize() {
    let totalSize = 0;
    if (this.fileUpload.files) {
      for (const file of this.fileUpload.files) {
        totalSize += file.size;
      }
    }
    this.totalSize = this.formatSize(totalSize);
    this.totalSizePercent = (totalSize / 10000000) * 100;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
