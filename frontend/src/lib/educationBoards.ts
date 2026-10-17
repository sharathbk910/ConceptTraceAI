// Comprehensive Indian and International Education Boards Dataset

export interface BoardOption {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  applicableClasses?: (10 | 11 | 12)[];
}

export interface RegionStateUT {
  name: string;
  type: 'state' | 'ut';
  boards: BoardOption[];
}

export const COUNTRIES = ['India', 'International'] as const;
export type CountryType = typeof COUNTRIES[number];

export const EDUCATION_SYSTEMS_INDIA = [
  'Indian National Boards',
  'State Education Boards',
  'Union Territory Boards',
] as const;

export const EDUCATION_SYSTEMS_INTL = [
  'International Baccalaureate (IB)',
  'Cambridge International (CAIE)',
  'Pearson Edexcel International',
] as const;

export const NATIONAL_BOARDS: BoardOption[] = [
  {
    id: 'cbse',
    name: 'Central Board of Secondary Education (CBSE)',
    shortName: 'CBSE',
    description: 'National curriculum following NCERT guidelines nationwide.',
    applicableClasses: [10, 11, 12],
  },
  {
    id: 'cisce',
    name: 'Council for the Indian School Certificate Examinations (CISCE - ICSE / ISC)',
    shortName: 'CISCE (ICSE / ISC)',
    description: 'ICSE (Indian Certificate of Secondary Education) for Class 10 and ISC (Indian School Certificate) for Class 11-12.',
    applicableClasses: [10, 11, 12],
  },
  {
    id: 'nios',
    name: 'National Institute of Open Schooling (NIOS)',
    shortName: 'NIOS',
    description: 'National board for open schooling and flexible secondary examination.',
    applicableClasses: [10, 11, 12],
  },
];

export const INTL_CURRICULA: Record<string, BoardOption[]> = {
  'International Baccalaureate (IB)': [
    {
      id: 'ib_myp_dp',
      name: 'International Baccalaureate (IB Middle Years Programme & Diploma Programme)',
      shortName: 'IB (MYP / DP)',
      description: 'Global inquiry-based curriculum (MYP for Class 10, DP for Class 11-12).',
      applicableClasses: [10, 11, 12],
    },
  ],
  'Cambridge International (CAIE)': [
    {
      id: 'caie_igcse_alevel',
      name: 'Cambridge Assessment International Education (CAIE - IGCSE / AS & A Levels)',
      shortName: 'Cambridge (CAIE / IGCSE / A-Levels)',
      description: 'British international qualification (IGCSE for Class 10, AS/A Levels for Class 11-12).',
      applicableClasses: [10, 11, 12],
    },
  ],
  'Pearson Edexcel International': [
    {
      id: 'edexcel_intl',
      name: 'Pearson Edexcel International GCSE & International Advanced Level',
      shortName: 'Pearson Edexcel International',
      description: 'UK-accredited global secondary qualification.',
      applicableClasses: [10, 11, 12],
    },
  ],
};

// All 28 Indian States with verified examination authorities
export const INDIAN_STATES: RegionStateUT[] = [
  {
    name: 'Andhra Pradesh',
    type: 'state',
    boards: [
      { id: 'ap_bseap', name: 'Board of Secondary Education, Andhra Pradesh (BSEAP - SSC)', shortName: 'BSEAP (AP Class 10)', applicableClasses: [10] },
      { id: 'ap_bieap', name: 'Board of Intermediate Education, Andhra Pradesh (BIEAP)', shortName: 'BIEAP (AP Intermediate)', applicableClasses: [11, 12] },
    ],
  },
  {
    name: 'Arunachal Pradesh',
    type: 'state',
    boards: [
      { id: 'arunachal_dse', name: 'Directorate of School Education, Arunachal Pradesh (CBSE Affiliated)', shortName: 'Arunachal Pradesh State Board', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Assam',
    type: 'state',
    boards: [
      { id: 'assam_seba', name: 'Board of Secondary Education, Assam (SEBA - HSLC)', shortName: 'SEBA Assam (HSLC)', applicableClasses: [10] },
      { id: 'assam_ahsec', name: 'Assam Higher Secondary Education Council (AHSEC)', shortName: 'AHSEC Assam (HSSLC)', applicableClasses: [11, 12] },
    ],
  },
  {
    name: 'Bihar',
    type: 'state',
    boards: [
      { id: 'bihar_bseb', name: 'Bihar School Examination Board (BSEB - Matric & Intermediate)', shortName: 'BSEB Bihar', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Chhattisgarh',
    type: 'state',
    boards: [
      { id: 'cg_cgbse', name: 'Chhattisgarh Board of Secondary Education (CGBSE)', shortName: 'CGBSE Chhattisgarh', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Goa',
    type: 'state',
    boards: [
      { id: 'goa_gbshse', name: 'Goa Board of Secondary and Higher Secondary Education (GBSHSE)', shortName: 'GBSHSE Goa', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Gujarat',
    type: 'state',
    boards: [
      { id: 'guj_gshseb', name: 'Gujarat Secondary and Higher Secondary Education Board (GSHSEB)', shortName: 'GSHSEB Gujarat', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Haryana',
    type: 'state',
    boards: [
      { id: 'har_bseh', name: 'Board of School Education Haryana (BSEH - Bhiwani Board)', shortName: 'BSEH Haryana', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Himachal Pradesh',
    type: 'state',
    boards: [
      { id: 'hp_hpbose', name: 'Himachal Pradesh Board of School Education (HPBOSE)', shortName: 'HPBOSE Himachal', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Jharkhand',
    type: 'state',
    boards: [
      { id: 'jh_jac', name: 'Jharkhand Academic Council (JAC Ranchi)', shortName: 'JAC Jharkhand', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Karnataka',
    type: 'state',
    boards: [
      { id: 'kar_kseab', name: 'Karnataka School Examination and Assessment Board (KSEAB - SSLC & 2nd PUC)', shortName: 'KSEAB Karnataka', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Kerala',
    type: 'state',
    boards: [
      { id: 'ker_kbpe', name: 'Kerala Board of Public Examinations (KBPE - SSLC)', shortName: 'KBPE Kerala (SSLC)', applicableClasses: [10] },
      { id: 'ker_dhse', name: 'Directorate of Higher Secondary Education, Kerala (DHSE / VHSE)', shortName: 'DHSE Kerala (Plus Two)', applicableClasses: [11, 12] },
    ],
  },
  {
    name: 'Madhya Pradesh',
    type: 'state',
    boards: [
      { id: 'mp_mpbse', name: 'Board of Secondary Education, Madhya Pradesh (MPBSE)', shortName: 'MPBSE Madhya Pradesh', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Maharashtra',
    type: 'state',
    boards: [
      { id: 'mah_msbshse', name: 'Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE - SSC & HSC)', shortName: 'MSBSHSE Maharashtra', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Manipur',
    type: 'state',
    boards: [
      { id: 'man_bosem', name: 'Board of Secondary Education, Manipur (BOSEM - HSLC)', shortName: 'BOSEM Manipur (HSLC)', applicableClasses: [10] },
      { id: 'man_cohsem', name: 'Council of Higher Secondary Education, Manipur (COHSEM)', shortName: 'COHSEM Manipur (HSE)', applicableClasses: [11, 12] },
    ],
  },
  {
    name: 'Meghalaya',
    type: 'state',
    boards: [
      { id: 'meg_mbose', name: 'Meghalaya Board of School Education (MBOSE - SSLC & HSSLC)', shortName: 'MBOSE Meghalaya', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Mizoram',
    type: 'state',
    boards: [
      { id: 'miz_mbse', name: 'Mizoram Board of School Education (MBSE - HSLC & HSSLC)', shortName: 'MBSE Mizoram', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Nagaland',
    type: 'state',
    boards: [
      { id: 'nag_nbse', name: 'Nagaland Board of School Education (NBSE - HSLC & HSSLC)', shortName: 'NBSE Nagaland', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Odisha',
    type: 'state',
    boards: [
      { id: 'odi_bse', name: 'Board of Secondary Education, Odisha (BSE Odisha - HSC)', shortName: 'BSE Odisha (HSC)', applicableClasses: [10] },
      { id: 'odi_chse', name: 'Council of Higher Secondary Education, Odisha (CHSE Odisha - +2)', shortName: 'CHSE Odisha (+2)', applicableClasses: [11, 12] },
    ],
  },
  {
    name: 'Punjab',
    type: 'state',
    boards: [
      { id: 'pun_pseb', name: 'Punjab School Education Board (PSEB - Mohali)', shortName: 'PSEB Punjab', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Rajasthan',
    type: 'state',
    boards: [
      { id: 'raj_rbse', name: 'Board of Secondary Education, Rajasthan (RBSE / BSER Ajmer)', shortName: 'RBSE Rajasthan', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Sikkim',
    type: 'state',
    boards: [
      { id: 'sik_sbse', name: 'Sikkim State Education Board / CBSE System', shortName: 'Sikkim State Board', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Tamil Nadu',
    type: 'state',
    boards: [
      { id: 'tn_dge', name: 'Tamil Nadu Directorate of Government Examinations (TNDGE - SSLC & HSE)', shortName: 'TNDGE Tamil Nadu', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Telangana',
    type: 'state',
    boards: [
      { id: 'ts_bset', name: 'Board of Secondary Education, Telangana (BSE Telangana - SSC)', shortName: 'BSE Telangana (SSC)', applicableClasses: [10] },
      { id: 'ts_tsbie', name: 'Telangana State Board of Intermediate Education (TSBIE)', shortName: 'TSBIE Telangana (Intermediate)', applicableClasses: [11, 12] },
    ],
  },
  {
    name: 'Tripura',
    type: 'state',
    boards: [
      { id: 'tri_tbse', name: 'Tripura Board of Secondary Education (TBSE - Madhyamik & H.S.)', shortName: 'TBSE Tripura', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Uttar Pradesh',
    type: 'state',
    boards: [
      { id: 'up_upmsp', name: 'Uttar Pradesh Madhyamik Shiksha Parishad (UPMSP Prayagraj - High School & Inter)', shortName: 'UPMSP Uttar Pradesh', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Uttarakhand',
    type: 'state',
    boards: [
      { id: 'ut_ubse', name: 'Uttarakhand Board of School Education (UBSE Ramnagar)', shortName: 'UBSE Uttarakhand', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'West Bengal',
    type: 'state',
    boards: [
      { id: 'wb_wbbse', name: 'West Bengal Board of Secondary Education (WBBSE - Madhyamik)', shortName: 'WBBSE West Bengal (Madhyamik)', applicableClasses: [10] },
      { id: 'wb_wbchse', name: 'West Bengal Council of Higher Secondary Education (WBCHSE - Higher Secondary)', shortName: 'WBCHSE West Bengal (HS)', applicableClasses: [11, 12] },
    ],
  },
];

// All 8 Indian Union Territories with relevant authorities
export const INDIAN_UTS: RegionStateUT[] = [
  {
    name: 'Andaman and Nicobar Islands',
    type: 'ut',
    boards: [
      { id: 'an_cbse', name: 'Directorate of Education, Andaman and Nicobar Islands (CBSE Pattern)', shortName: 'A&N Islands (CBSE)', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Chandigarh',
    type: 'ut',
    boards: [
      { id: 'ch_cbse', name: 'Department of Education, Chandigarh Administration (CBSE Pattern)', shortName: 'Chandigarh Education (CBSE)', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'ut',
    boards: [
      { id: 'dn_gshseb', name: 'Directorate of Education, DNHDD (Gujarat Board & CBSE Affiliated)', shortName: 'DNHDD Education Board', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Delhi',
    type: 'ut',
    boards: [
      { id: 'del_dbse', name: 'Delhi Board of School Education (DBSE)', shortName: 'DBSE Delhi', applicableClasses: [10, 11, 12] },
      { id: 'del_cbse', name: 'Directorate of Education, Government of NCT of Delhi (CBSE)', shortName: 'Delhi Schools (CBSE)', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Jammu and Kashmir',
    type: 'ut',
    boards: [
      { id: 'jk_jkbose', name: 'Jammu and Kashmir State Board of School Education (JKBOSE)', shortName: 'JKBOSE Jammu & Kashmir', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Ladakh',
    type: 'ut',
    boards: [
      { id: 'lad_jkbose_cbse', name: 'Department of School Education, Ladakh (JKBOSE / CBSE Affiliated)', shortName: 'Ladakh School Education', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Lakshadweep',
    type: 'ut',
    boards: [
      { id: 'lak_kbpe_cbse', name: 'Department of Education, Lakshadweep (Kerala State Board & CBSE Pattern)', shortName: 'Lakshadweep Education', applicableClasses: [10, 11, 12] },
    ],
  },
  {
    name: 'Puducherry',
    type: 'ut',
    boards: [
      { id: 'pud_tndge', name: 'Directorate of School Education, Puducherry (Tamil Nadu & Kerala Pattern)', shortName: 'Puducherry School Board', applicableClasses: [10, 11, 12] },
    ],
  },
];

export const STREAMS = [
  'Science (PCM - Physics, Chemistry, Mathematics)',
  'Science (PCB - Physics, Chemistry, Biology)',
  'Science (PCMB - Physics, Chemistry, Mathematics, Biology)',
  'Commerce (Accountancy, Business Studies, Economics)',
  'Arts & Humanities (History, Political Science, Geography, Economics)',
  'General / Vocational Stream',
] as const;

export const LANGUAGES = [
  'English',
  'Hindi',
  'Kannada',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Odia',
  'Punjabi',
  'Urdu',
  'Other Language',
] as const;

export const STREAM_SUBJECTS: Record<string, string[]> = {
  'Science (PCM - Physics, Chemistry, Mathematics)': [
    'Physics',
    'Chemistry',
    'Mathematics',
    'English Core',
    'Computer Science',
    'Physical Education',
  ],
  'Science (PCB - Physics, Chemistry, Biology)': [
    'Physics',
    'Chemistry',
    'Biology',
    'English Core',
    'Psychology',
    'Physical Education',
  ],
  'Science (PCMB - Physics, Chemistry, Mathematics, Biology)': [
    'Physics',
    'Chemistry',
    'Mathematics',
    'Biology',
    'English Core',
    'Computer Science',
  ],
  'Commerce (Accountancy, Business Studies, Economics)': [
    'Accountancy',
    'Business Studies',
    'Economics',
    'English Core',
    'Mathematics / Applied Mathematics',
    'Informatics Practices',
  ],
  'Arts & Humanities (History, Political Science, Geography, Economics)': [
    'History',
    'Political Science',
    'Geography',
    'Economics',
    'Psychology',
    'English Core',
    'Sociology',
  ],
  'General / Vocational Stream': [
    'General Mathematics',
    'General Science',
    'English Communication',
    'Information Technology',
    'Entrepreneurship',
  ],
};

export const CLASS_10_DEFAULT_SUBJECTS = [
  'Mathematics',
  'Science',
  'Social Science',
  'English Language & Literature',
  'Computer Applications',
  'Hindi / Regional Language',
];

export const FALLBACK_GENERAL_SUBJECTS = [
  'Mathematics',
  'Science / Physics & Chemistry',
  'Biology',
  'Social Studies',
  'English',
  'Computer Science / IT',
  'Commerce / Economics',
];
