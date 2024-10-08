/*
!#######################################################################
! C-PATTM SOFTWARE
! CRANE C-PATTM plan of action and milestones software. Use is governed by the Open Source Academic Research License Agreement contained in the file
! crane_C_PAT.1_license.txt, which is part of this software package. BY
! USING OR MODIFYING THIS SOFTWARE, YOU ARE AGREEING TO THE TERMS AND    
! CONDITIONS OF THE LICENSE.  
!########################################################################
*/

interface Permission {
  userId: number;
  collectionId: number;
  accessLevel: number;
}
export interface Users {
  userId: number;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  created: string;
  lastAccess: string;
  lastCollectionAccessedId: number;
  accountStatus: string;
  fullName: string | null;
  officeOrg: string;
  defaultTheme: string;
  isAdmin: number;
  lastClaims: any;
  points: number;
  permissions: Permission[];
}
