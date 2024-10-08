/*
!#######################################################################
! C-PATTM SOFTWARE
! CRANE C-PATTM plan of action and milestones software. Use is governed by the Open Source Academic Research License Agreement contained in the file
! crane_C_PAT.1_license.txt, which is part of this software package. BY
! USING OR MODIFYING THIS SOFTWARE, YOU ARE AGREEING TO THE TERMS AND    
! CONDITIONS OF THE LICENSE.  
!########################################################################
*/

import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, Subscription } from 'rxjs';
import { SubSink } from 'subsink';
import { ConfirmationDialogComponent, ConfirmationDialogOptions } from '../../common/components/confirmation-dialog/confirmation-dialog.component';
import { SharedService } from '../../common/services/shared.service';
import { LabelService } from './label.service';
import { Table } from 'primeng/table';
import { PayloadService } from '../../common/services/setPayload.service';

interface LabelEntry {
  labelId: string;
  labelName: string;
  description: string;
}

@Component({
  selector: 'cpat-label-processing',
  templateUrl: './label-processing.component.html',
  styleUrls: ['./label-processing.component.scss'],
  providers: [DialogService]
})
export class LabelProcessingComponent implements OnInit, OnDestroy {
  @ViewChild('labelPopup') labelPopup!: TemplateRef<any>;
  @ViewChild('labelTable') labelTable!: Table;
  labelDialogVisible: boolean = false;
  customColumn = 'label';
  defaultColumns = ['Name', 'Description'];
  allColumns = [this.customColumn, ...this.defaultColumns];
  data: LabelEntry[] = [];
  filterValue: string = '';
  users: any;
  public isLoggedIn = false;
  labels: LabelEntry[] = [];
  label: LabelEntry = { labelId: '', labelName: '', description: '' };
  allowSelectLabels = true;
  selected: any;
  selectedRole: string = 'admin';
  selectedCollection: any;
  selectedLabels: LabelEntry[] = [];
  protected accessLevel: any;
  user: any;
  payload: any;
  private payloadSubscription: Subscription[] = [];
  private subscriptions = new Subscription();
  private subs = new SubSink();

  constructor(
    private labelService: LabelService,
    private dialogService: DialogService,
    private setPayloadService: PayloadService,
    private sharedService: SharedService) {
  }

  onSubmit() {
    this.resetData();
  }

  async ngOnInit() {
    this.subscriptions.add(
      this.sharedService.selectedCollection.subscribe(collectionId => {
        this.selectedCollection = collectionId;
      })
    );
    this.setPayload();
  }

  async setPayload() {
    await this.setPayloadService.setPayload();
    this.payloadSubscription.push(
      this.setPayloadService.user$.subscribe(user => {
        this.user = user;
      }),
      this.setPayloadService.payload$.subscribe(payload => {
        this.payload = payload;
      }),
      this.setPayloadService.accessLevel$.subscribe(level => {
        this.accessLevel = level;
        if (this.accessLevel > 0) {
          this.getLabelData();
        }
      })
    );
  }

  async getLabelData() {
    this.labels = [];
    this.subs.sink = (await this.labelService.getLabels(this.selectedCollection)).subscribe((result: any) => {
      this.data = (result as LabelEntry[]).map(label => ({
        ...label,
        labelId: String(label.labelId)
      })).sort((a, b) => a.labelId.localeCompare(b.labelId));
      this.labels = this.data;
    }, error => {
      console.error('Error fetching labels:', error);
    });
  }

  setLabel(labelId: string) {
    const selectedData = this.data.find(label => label.labelId === labelId);
    if (selectedData) {
      this.label = { ...selectedData };
      this.labelDialogVisible = true;
    } else {
      this.label = { labelId: '', labelName: '', description: '' };
    }
  }

  openLabelPopup() {
    this.labelDialogVisible = true;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (this.labelTable) {
      this.labelTable.filterGlobal(filterValue, 'contains');
    }
  }

  clear() {
    this.filterValue = '';
    if (this.labelTable) {
      this.labelTable.clear();
    }
    this.data = [...this.labels];
  }


  resetData() {
    this.label = { labelId: '', labelName: '', description: '' };
    this.getLabelData();
    this.label.labelId = "ADDLABEL";
    this.allowSelectLabels = true;
  }

  addLabel() {
    this.label = { labelId: 'ADDLABEL', labelName: '', description: '' };
    this.labelDialogVisible = true;
  }

  closeLabelPopup() {
    this.labelDialogVisible = false;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.subscriptions.unsubscribe();
    this.payloadSubscription.forEach(subscription => subscription.unsubscribe());
  }

  confirm = (dialogOptions: ConfirmationDialogOptions): Observable<boolean> =>
    this.dialogService.open(ConfirmationDialogComponent, {
      data: {
        options: dialogOptions,
      },
    }).onClose;
}
