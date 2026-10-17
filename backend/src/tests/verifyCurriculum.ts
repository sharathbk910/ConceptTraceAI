import { db } from '../services/db/database.js';
import { TopicMasteryService } from '../services/learning/topicMasteryService.js';

console.log('--- TESTING FULL SYLLABUS RETRIEVAL ---');

// Test 1: CBSE Class 10
const cbse10 = db.getOfficialSyllabus('CBSE', 10);
console.log(`\nCBSE Class 10 subjects count: ${cbse10.subjects.length}`);
cbse10.subjects.forEach(s => {
  const chaps = s.units.reduce((acc, u) => acc + u.chapters.length, 0);
  const cons = s.units.reduce((acc, u) => acc + u.chapters.reduce((cAcc, c) => cAcc + c.concepts.length, 0), 0);
  console.log(` - ${s.subject_name} (${s.code || 'N/A'}): ${s.units.length} units, ${chaps} chapters, ${cons} concepts`);
});

// Test 2: CBSE Class 11 (Science PCM)
const cbse11 = db.getOfficialSyllabus('CBSE', 11, 'Science (PCM)');
console.log(`\nCBSE Class 11 (PCM) subjects count: ${cbse11.subjects.length}`);
cbse11.subjects.forEach(s => {
  const chaps = s.units.reduce((acc, u) => acc + u.chapters.length, 0);
  const cons = s.units.reduce((acc, u) => acc + u.chapters.reduce((cAcc, c) => cAcc + c.concepts.length, 0), 0);
  console.log(` - ${s.subject_name}: ${s.units.length} units, ${chaps} chapters, ${cons} concepts`);
});

// Test 3: CBSE Class 12 (Science PCM/PCB)
const cbse12 = db.getOfficialSyllabus('CBSE', 12, 'Science (PCM/PCB)');
console.log(`\nCBSE Class 12 subjects count: ${cbse12.subjects.length}`);
cbse12.subjects.forEach(s => {
  const chaps = s.units.reduce((acc, u) => acc + u.chapters.length, 0);
  const cons = s.units.reduce((acc, u) => acc + u.chapters.reduce((cAcc, c) => cAcc + c.concepts.length, 0), 0);
  console.log(` - ${s.subject_name}: ${s.units.length} units, ${chaps} chapters, ${cons} concepts`);
});

// Test 4: CISCE Class 10
const cisce10 = db.getOfficialSyllabus('CISCE (ICSE / ISC)', 10);
console.log(`\nCISCE Class 10 subjects count: ${cisce10.subjects.length}`);
cisce10.subjects.forEach(s => {
  const chaps = s.units.reduce((acc, u) => acc + u.chapters.length, 0);
  const cons = s.units.reduce((acc, u) => acc + u.chapters.reduce((cAcc, c) => cAcc + c.concepts.length, 0), 0);
  console.log(` - ${s.subject_name}: ${s.units.length} units, ${chaps} chapters, ${cons} concepts`);
});

// Test 5: State Board (Maharashtra Class 12)
const maha12 = db.getOfficialSyllabus('Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE - SSC & HSC)', 12);
console.log(`\nMaharashtra Board Class 12 subjects count: ${maha12.subjects.length}`);
console.log(`Official portal URL: ${maha12.official_source_url}`);

// Test 6: Database Syllabus Topics count
const allDbTopics = db.getSyllabusTopics();
console.log(`\nTotal db.getSyllabusTopics() count: ${allDbTopics.length}`);

console.log('\n--- ALL RETRIEVAL TESTS COMPLETED SUCCESSFULLY ---');
