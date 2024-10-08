/*
!#######################################################################
! C-PATTM SOFTWARE
! CRANE C-PATTM plan of action and milestones software. Use is governed by the Open Source Academic Research License Agreement contained in the file
! crane_C_PAT.1_license.txt, which is part of this software package. BY
! USING OR MODIFYING THIS SOFTWARE, YOU ARE AGREEING TO THE TERMS AND    
! CONDITIONS OF THE LICENSE.  
!########################################################################
*/

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, ChartData, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Observable, Subscription } from 'rxjs';
import { SubSink } from "subsink";
import { SharedService } from '../../../common/services/shared.service';
import { CollectionsService } from '../../admin-processing/collection-processing/collections.service';
import { UsersService } from '../../admin-processing/user-processing/users.service';
import { TreeTable } from 'primeng/treetable';
import { ConfirmationService, MessageService, TreeNode } from 'primeng/api';

interface AssetEntry {
  groupId: string;
  title: string;
  severity: string;
  assets?: AssetEntry[];
}

@Component({
  selector: 'cpat-stigmanager-import',
  templateUrl: './stigmanager-import.component.html',
  styleUrls: ['./stigmanager-import.component.scss']
})
export class STIGManagerImportComponent implements OnInit, OnDestroy {
  @ViewChild('stigFindingsTable') table!: TreeTable;
  @ViewChild('findingChart') findingChart!: ElementRef<HTMLCanvasElement>;
  customColumn = 'Group ID';
  defaultColumns = ['Rule Title', 'Benchmark ID', 'Severity', 'Asset Count', 'POAM'];
  allColumns = [this.customColumn, ...this.defaultColumns];
  dataSource: TreeNode<AssetEntry>[] = [];
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  selectedFindings: string = '';
  collectionBasicList: any[] = [];
  sortField: string = '';
  sortOrder: number = 1;
  treeData: any[] = [];
  originalTreeData: any[] = [];
  selectedCollection: any;
  stigmanCollection: { name: string; description: string; collectionId: string; } | undefined;
  user: any;
  private subs = new SubSink();
  private subscriptions = new Subscription();

  public findings: any[] = [];
  findingsCount: number = 0;
  findingsChart!: Chart;
  findingsChartData: ChartData<'bar'> = {
    labels: [''],
    datasets: [],
  };
  public selectedPosition: any = 'bottom';
  barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    scales: {
      x: {
        beginAtZero: true,
        grace: '5%',
        grid: {
          display: false
        },
        ticks: {
          font: {
            weight: 600,
          },
        }
      },
      y: {
        grid: {
          display: true
        },
      },
    },
    plugins: {
      title: {
        display: false,
      },
      legend: {
        display: true,
        position: this.selectedPosition,
        labels: {
          font: {
            size: 13,
            family: 'sans-serif',
            weight: 600,
          }
        }
      },
    },
  };

  findingsFilterOptions = [
    { label: 'All', value: 'All' },
    { label: 'Has Existing POAM', value: 'Has Existing POAM' },
    { label: 'No Existing POAM', value: 'No Existing POAM' }
  ];

  constructor(
    private router: Router,
    private collectionService: CollectionsService,
    private sharedService: SharedService,
    private userService: UsersService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {
    Chart.register(...registerables);
  }

  async ngOnInit() {
    this.subscriptions.add(
      this.sharedService.selectedCollection.subscribe(collectionId => {
        this.selectedCollection = collectionId;
      })
    );
    this.initializeComponent();
    this.selectedFindings = 'No Existing POAM';
  }


  private async initializeComponent() {
    try {
      const user = await (await this.userService.getCurrentUser()).toPromise();
      if (user?.userId) {
        this.user = user;
        await this.validateStigManagerCollection();
      } else {
        this.showError('Failed to retrieve current user.');
      }
    } catch (error) {
      console.error('An error occurred:', error);
      this.showError('An error occurred while initializing the component.');
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  updateSort(event: any) {
    this.sortField = event.field;
    this.sortOrder = event.order;
  }

  updateFindingsChartData(findings: any[]): void {
    if (this.findingsChart) {
      const datasets = findings.map((item) => ({
        label: item.severity,
        data: [item.severityCount],
        datalabels: {},
      }));
      this.findingsChart.data.datasets = datasets;
      this.findingsChart.update();
    } else {
      console.warn("Findings chart is not initialized.");
    }
  }

  private initializeChart(): void {
    Chart.defaults.set('plugins.datalabels', {
      display: false,
    });
    if (this.findingChart?.nativeElement) {
      this.findingsChart = new Chart(this.findingChart.nativeElement, {
        type: 'bar',
        data: this.findingsChartData,
        plugins: [ChartDataLabels],
        options: this.barChartOptions,
      });
    } else {
      console.error('Unable to initialize chart: Element not available.');
    }
  }

  filterGlobal(event: Event) {
    const inputValue = (event.target as HTMLInputElement)?.value || '';
    this.table.filterGlobal(inputValue, 'contains');
  }

  exportChart(chartInstance: Chart, chartName: string) {
    const exportDatalabelsOptions = {
      backgroundColor: function (context: any) {
        const datasetBackgroundColor = context.chart.data.datasets[context.datasetIndex].backgroundColor;
        return Array.isArray(datasetBackgroundColor)
          ? datasetBackgroundColor[context.dataIndex]
          : datasetBackgroundColor;
      },
      borderRadius: 4,
      color: 'white',
      display: true,
      font: {
        weight: 'bold'
      },
      align: 'end',
      anchor: 'end',
      padding: 6
    };

    chartInstance.data.datasets.forEach(dataset => {
      if (dataset.datalabels) {
        Object.assign(dataset.datalabels, exportDatalabelsOptions);
      }
    });
    chartInstance.options.plugins!.title = {
      display: true,
      text: `${chartName}`,
      position: 'bottom'
    };
    chartInstance.update();

    setTimeout(() => {
      const canvas = chartInstance.canvas;
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${chartName}_Export.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        const disappearDatalabelsOptions = {
          display: false
        };

        chartInstance.data.datasets.forEach(dataset => {
          if (dataset.datalabels) {
            Object.assign(dataset.datalabels, disappearDatalabelsOptions);
          }
        });
        chartInstance.options.plugins!.title = {
          display: false,
        };
        chartInstance.update();
      }, 500);

    }, 150);
  }

  async validateStigManagerCollection() {
    try {
      const [stigmanData, basicListData] = await Promise.all([
        (await this.sharedService.getCollectionsFromSTIGMAN()).toPromise(),
        (await this.collectionService.getCollectionBasicList()).toPromise()
      ]);

      const stigmanCollectionsMap = new Map(stigmanData?.map(collection => [collection.name, collection]));
      const basicListCollectionsMap = new Map(basicListData?.map(collection => [collection.collectionId, collection]));

      const selectedCollection = basicListCollectionsMap.get(this.user.lastCollectionAccessedId);
      const selectedCollectionName = selectedCollection?.collectionName;
      this.stigmanCollection = selectedCollectionName ? stigmanCollectionsMap.get(selectedCollectionName) : undefined;

      if (!this.stigmanCollection || !selectedCollectionName) {
        this.showWarn('Unable to determine matching STIG Manager collection for Asset association. Please ensure that you are viewing a STIG Manager collection.');
        return;
      }

      await Promise.all([
        this.getAffectedAssetGrid(this.stigmanCollection.collectionId)
      ]);
    } catch (error) {
      console.error('Error in validateStigManagerCollection:', error);
      this.showError('Failed to validate STIG Manager collection. Please try again.');
    }
  }

  async getAffectedAssetGrid(stigmanCollection: string) {
    try {
      const data = await (await this.sharedService.getAffectedAssetsFromSTIGMAN(stigmanCollection)).toPromise();
      if (!data || data.length === 0) {
        this.showWarn('No affected assets found.');
        return;
      }

      const mappedData = data.map(item => ({
        data: {
          'Group ID': item.groupId,
          'Rule Title': item.rules[0].title,
          'ruleId': item.rules[0].ruleId,
          'Benchmark ID': item.stigs[0].benchmarkId,
          'Severity': item.severity === 'high' ? 'CAT I - High' :
            item.severity === 'medium' ? 'CAT II - Medium' :
              item.severity === 'low' ? 'CAT III - Low' : item.severity,
          'Asset Count': item.assetCount
        },
        children: item.assets.map((asset: { name: any; assetId: any; }) => ({
          data: {
            'Rule Title': asset.name,
            'Benchmark ID': 'Asset ID: ' + asset.assetId,
          }
        }))
      }));

      this.originalTreeData = [...mappedData];
      this.treeData = [...mappedData];
      this.dataSource = this.convertToTreeNodes(this.treeData);
      this.findingsCount = this.treeData.length;

      const severityGroups = data.reduce((groups: any, item: any) => {
        const severity = item.severity === 'high' ? 'CAT I - High' :
          item.severity === 'medium' ? 'CAT II - Medium' :
            item.severity === 'low' ? 'CAT III - Low' : item.severity;
        if (!groups[severity]) {
          groups[severity] = 0;
        }
        groups[severity]++;
        return groups;
      }, {});

      const findings = Object.entries(severityGroups).map(([severity, count]) => ({
        severity,
        severityCount: count
      }));

      const allSeverities = ['CAT I - High', 'CAT II - Medium', 'CAT III - Low'];
      allSeverities.forEach(severity => {
        if (!findings.find(finding => finding.severity === severity)) {
          findings.push({ severity, severityCount: 0 });
        }
      });

      findings.sort((a, b) => allSeverities.indexOf(a.severity) - allSeverities.indexOf(b.severity));
      this.selectedFindings = 'No Existing POAM';
      this.filterFindings();
      this.initializeChart();
      this.updateFindingsChartData(findings);
    } catch (err) {
      console.error('Failed to fetch affected assets from STIGMAN:', err);
      this.showError('Failed to fetch affected assets. Please try again.');
    }
  }

  convertToTreeNodes(data: any[]): TreeNode<AssetEntry>[] {
    return data.map(item => ({
      data: item.data,
      children: item.children ? this.convertToTreeNodes(item.children) : []
    }));
  }

  async filterFindings() {
    (await this.sharedService.getExistingVulnerabilityPoams()).subscribe({
      next: (response: any) => {
        const existingPoams = response;
        this.updateChartAndGrid(existingPoams);
      },
      error: (error) => {
        console.error('Error retrieving existing POAMs:', error);
        this.showError("Error retrieving existing POAMs. Please try again.");
      }
    });
  }

  async updateChartAndGrid(existingPoams: any[]) {
    const filteredTreeData = this.treeData.map(item => {
      const hasExistingPoam = existingPoams.some(poam => poam.vulnerabilityId === item.data['Group ID']);
      item.data.hasExistingPoam = hasExistingPoam;
      if (this.selectedFindings === 'All' ||
        (this.selectedFindings === 'Has Existing POAM' && hasExistingPoam) ||
        (this.selectedFindings === 'No Existing POAM' && !hasExistingPoam)) {
        return item;
      }
      return null;
    }).filter(item => item !== null);

    this.dataSource = this.convertToTreeNodes(filteredTreeData);
    this.findingsCount = filteredTreeData.length;
    const severityGroups = filteredTreeData.reduce((groups: any, item: any) => {
      const severity = item.data['Severity'];
      if (!groups[severity]) {
        groups[severity] = 0;
      }
      groups[severity]++;
      return groups;
    }, {});

    const findings = Object.entries(severityGroups).map(([severity, count]) => ({
      severity,
      severityCount: count
    }));

    const allSeverities = ['CAT I - High', 'CAT II - Medium', 'CAT III - Low'];
    allSeverities.forEach(severity => {
      if (!findings.find(finding => finding.severity === severity)) {
        findings.push({ severity, severityCount: 0 });
      }
    });

    findings.sort((a, b) => allSeverities.indexOf(a.severity) - allSeverities.indexOf(b.severity));

    this.updateFindingsChartData(findings);
  }

  async addPoam(node: any) {
    if (node && node.node && node.node.data) {
      const rowData = node.node.data;
      if (rowData['ruleId']) {
        const ruleId = rowData['ruleId'];
        (await this.sharedService.getRuleDataFromSTIGMAN(ruleId)).subscribe({
          next: async (ruleData: any) => {
            const ruleDataString = `# Rule data from STIGMAN
## Discussion
${ruleData.detail.vulnDiscussion}
---

## Check
${ruleData.check.content}
---

## Fix
${ruleData.fix.text}
---`;

            const descriptionString = `Title:
${ruleData.title}

Description:
${ruleData.detail.vulnDiscussion}`;

            if (rowData['Group ID']) {
              (await this.sharedService.getPoamsByVulnerabilityId(rowData['Group ID'])).subscribe({
                next: (response: any) => {
                  if (response && response.length > 0) {
                    const poam = response[0];
                    this.router.navigate(['/poam-processing/poam-details/' + poam.poamId], {
                      state: {
                        vulnerabilitySource: 'STIG',
                        vulnerabilityId: rowData['Group ID'],
                        benchmarkId: rowData['Benchmark ID'],
                        severity: rowData['Severity'],
                        ruleData: ruleDataString,
                        description: descriptionString,
                      }
                    });
                  } else {
                    this.router.navigate(['/poam-processing/poam-details/ADDPOAM'], {
                      state: {
                        vulnerabilitySource: 'STIG',
                        vulnerabilityId: rowData['Group ID'],
                        benchmarkId: rowData['Benchmark ID'],
                        severity: rowData['Severity'],
                        ruleData: ruleDataString,
                        description: descriptionString,
                      }
                    });
                  }
                },
                error: (error) => {
                  console.error('Error retrieving POAM:', error);
                  this.showError("Error creating POAM. Please try again.");
                }
              });
            } else {
              console.error('Group ID not found in row data:', rowData);
              this.showError("Error creating POAM. Please try again.");
            }
          },
          error: (error) => {
            console.error('Error retrieving rule data from STIGMAN:', error);
            this.showError("Error retrieving rule data. Please try again.");
          }
        });
      } else {
        console.error('Rule ID not found in row data:', rowData);
        this.showError("Error creating POAM. Please try again.");
      }
    } else {
      console.error('Invalid node data:', node);
      this.showError("Error creating POAM. Please try again.");
    }
  }

  showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: message });
  }

  showInfo(message: string) {
    this.messageService.add({ severity: 'info', summary: 'Info', detail: message });
  }

  showWarn(message: string) {
    this.messageService.add({ severity: 'warn', summary: 'Warn', detail: message });
  }

  showError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  confirm(message: string): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.confirmationService.confirm({
        message: message,
        accept: () => {
          observer.next(true);
          observer.complete();
        },
        reject: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
}
