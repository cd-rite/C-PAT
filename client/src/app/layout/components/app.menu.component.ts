/*
!#######################################################################
! C-PATTM SOFTWARE
! CRANE C-PATTM plan of action and milestones software. Use is governed by the Open Source Academic Research License Agreement contained in the file
! crane_C_PAT.1_license.txt, which is part of this software package. BY
! USING OR MODIFYING THIS SOFTWARE, YOU ARE AGREEING TO THE TERMS AND    
! CONDITIONS OF THE LICENSE.  
!########################################################################
*/

import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { CollectionsService } from '../../pages/admin-processing/collection-processing/collections.service';
import { Router } from '@angular/router';
import { PayloadService } from '../../common/services/setPayload.service';

@Component({
  selector: 'app-menu',
  templateUrl: './app.menu.component.html'
})

export class AppMenuComponent implements OnInit, OnDestroy {
  model: MenuItem[] = [];
  selectedCollection: string;
  collectionType: string;
  userRole: string = '';
  user: any;
  protected accessLevel: any;
  private payloadSubscription: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private collectionService: CollectionsService,
    private setPayloadService: PayloadService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.initializeUser();
  }

  async initializeUser() {
    try {
      const userData = await this.authService.getUserData('cpat');
      if (userData) {
        await this.setPayloadService.setPayload();
        this.payloadSubscription.push(
          this.setPayloadService.user$.subscribe(user => {
            this.user = user;
            
          }),
          this.setPayloadService.accessLevel$.subscribe(level => {
            this.accessLevel = level;
            if (this.accessLevel > 0) {
              this.selectedCollection = this.user.lastCollectionAccessedId;
              this.getCollectionType();
            }
          })
        );
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  }

  async getCollectionType() {
    try {
    await (await this.collectionService.getCollectionBasicList()).subscribe({
      next: (data) => {
        const selectedCollectionData = data.find((collection: any) => collection.collectionId === this.selectedCollection);
        if (selectedCollectionData) {
          this.collectionType = selectedCollectionData.collectionOrigin!;
        } else {
          this.collectionType = 'C-PAT';
        }
        this.setMenuItems();
      },
      error: (error) => {
        this.collectionType = 'C-PAT';
      }
    });
    } catch(error) {
    console.error('Error initializing user:', error);
    }
  }

  setMenuItems() {
    const menuItems: MenuItem[] = [
      {
        label: 'Home',
        icon: 'pi pi-home',
        routerLink: ['/poam-processing'],
        visible: true,
      },
      {
        label: 'Admin Portal',
        icon: 'pi pi-users',
        routerLink: ['/admin-processing'],
        visible: this.user.isAdmin,
      },
      {
        label: 'Manage POAMs',
        icon: 'pi pi-list-check',
        routerLink: ['/poam-processing/poam-manage'],
        visible: this.accessLevel >= 1,
      },
      {
        label: 'Add POAM',
        icon: 'pi pi-file-plus',
        routerLink: ['/poam-processing/poam-details/ADDPOAM'],
        visible: this.accessLevel >= 2,
      },
      {
        label: 'STIG Manager',
        icon: 'pi pi-shield',
        routerLink: ['/import-processing/stigmanager-import'],
        visible: this.accessLevel >= 1 && this.collectionType === 'STIG Manager',
      },
      {
        label: 'Tenable',
        icon: 'pi pi-file-import',
        routerLink: ['/import-processing/tenable-import'],
        visible: this.accessLevel >= 1 && this.collectionType === 'Tenable',
      },
      {
        label: 'Asset Processing',
        icon: 'pi pi-server',
        routerLink: ['/asset-processing'],
        visible: this.accessLevel >= 1,
      },
      {
        label: 'Label Processing',
        icon: 'pi pi-tags',
        routerLink: ['/label-processing'],
        visible: this.accessLevel >= 1,
      },
      {
        label: 'Log Out',
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
        visible: true,
      }
    ];

    this.model = menuItems.filter(item => item.visible !== false);
    this.model.forEach(item => {
      if (item.items) {
        item.items = item.items.filter(subItem => subItem.visible !== false);
      }
    });
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }

  ngOnDestroy(): void {
    this.payloadSubscription.forEach(subscription => subscription.unsubscribe());
  }
}
