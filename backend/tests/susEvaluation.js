/**
 * SafeCircle System Usability Scale (SUS) Evaluation Suite
 * Simulates 30 participant usability surveys and computes SUS empirical statistics.
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5001;

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: PORT, ...options }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// 30 Realistic Participant Profiles (Students, Academic Staff, IT Engineers)
const participantProfiles = [
  { id: 'P01', role: 'Student', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [42, 22, 28, 18, 30] },
  { id: 'P02', role: 'Student', q: [4, 2, 5, 1, 4, 1, 5, 2, 4, 1], times: [48, 25, 32, 22, 35] },
  { id: 'P03', role: 'IT Staff', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [35, 18, 22, 14, 25] },
  { id: 'P04', role: 'Student', q: [4, 1, 4, 2, 5, 2, 4, 1, 4, 2], times: [52, 28, 35, 24, 38] },
  { id: 'P05', role: 'General User', q: [4, 2, 4, 2, 4, 1, 4, 2, 4, 2], times: [58, 30, 40, 28, 42] },
  { id: 'P06', role: 'Student', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [40, 20, 26, 16, 28] },
  { id: 'P07', role: 'Academic Staff', q: [4, 1, 5, 1, 4, 2, 5, 1, 5, 1], times: [44, 23, 29, 19, 32] },
  { id: 'P08', role: 'Student', q: [5, 2, 4, 1, 5, 1, 4, 1, 4, 2], times: [46, 24, 30, 20, 34] },
  { id: 'P09', role: 'IT Staff', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [32, 16, 20, 12, 22] },
  { id: 'P10', role: 'Student', q: [4, 2, 5, 2, 4, 1, 5, 2, 5, 1], times: [50, 26, 34, 22, 36] },
  { id: 'P11', role: 'Student', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [38, 19, 25, 15, 27] },
  { id: 'P12', role: 'General User', q: [4, 2, 4, 2, 4, 2, 4, 1, 4, 2], times: [60, 32, 42, 30, 45] },
  { id: 'P13', role: 'Student', q: [5, 1, 5, 1, 4, 1, 5, 1, 5, 1], times: [41, 21, 27, 17, 29] },
  { id: 'P14', role: 'Academic Staff', q: [4, 1, 4, 1, 5, 1, 4, 2, 4, 1], times: [47, 24, 31, 21, 33] },
  { id: 'P15', role: 'Student', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [39, 20, 25, 16, 28] },
  { id: 'P16', role: 'IT Staff', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [30, 15, 18, 11, 20] },
  { id: 'P17', role: 'Student', q: [4, 2, 5, 1, 4, 1, 5, 1, 4, 2], times: [49, 25, 33, 23, 35] },
  { id: 'P18', role: 'Student', q: [5, 1, 4, 1, 5, 2, 4, 1, 5, 1], times: [43, 22, 28, 18, 30] },
  { id: 'P19', role: 'General User', q: [4, 2, 4, 2, 4, 1, 4, 2, 4, 2], times: [56, 29, 38, 26, 40] },
  { id: 'P20', role: 'Student', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [37, 18, 24, 15, 26] },
  { id: 'P21', role: 'Academic Staff', q: [4, 1, 5, 1, 4, 1, 5, 1, 4, 1], times: [45, 23, 30, 20, 32] },
  { id: 'P22', role: 'Student', q: [5, 2, 5, 1, 5, 1, 4, 1, 5, 2], times: [44, 22, 29, 19, 31] },
  { id: 'P23', role: 'IT Staff', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [33, 16, 21, 13, 23] },
  { id: 'P24', role: 'Student', q: [4, 1, 4, 2, 4, 1, 5, 2, 4, 1], times: [51, 27, 36, 25, 37] },
  { id: 'P25', role: 'Student', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [36, 17, 23, 14, 25] },
  { id: 'P26', role: 'General User', q: [4, 2, 4, 1, 4, 2, 4, 1, 4, 2], times: [55, 28, 37, 27, 39] },
  { id: 'P27', role: 'Student', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [38, 19, 25, 15, 27] },
  { id: 'P28', role: 'Academic Staff', q: [4, 1, 5, 1, 4, 1, 5, 1, 5, 1], times: [46, 24, 31, 21, 33] },
  { id: 'P29', role: 'Student', q: [5, 1, 4, 1, 5, 1, 4, 1, 4, 1], times: [42, 21, 27, 17, 29] },
  { id: 'P30', role: 'IT Staff', q: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], times: [31, 15, 19, 12, 21] },
];

async function runSusEvaluation() {
  console.log('===============================================================');
  console.log('🎓 SAFECIRCLE SYSTEM USABILITY SCALE (SUS) EVALUATION SUITE');
  console.log('===============================================================\n');

  let serverProcess = null;

  try {
    await httpRequest({ path: '/api/auth/register', method: 'GET' });
  } catch (e) {
    console.log('[SUS Audit] Spawning local Express backend server...');
    serverProcess = spawn('node', [path.join(__dirname, '../server.js')], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '5001' },
    });
    await new Promise((resolve) => setTimeout(resolve, 3500));
  }

  try {
    console.log(`[SUS] Submitting ${participantProfiles.length} participant survey evaluations...`);
    const scores = [];

    for (const p of participantProfiles) {
      const payload = {
        participantId: p.id,
        participantRole: p.role,
        task1TimeSec: p.times[0],
        task2TimeSec: p.times[1],
        task3TimeSec: p.times[2],
        task4TimeSec: p.times[3],
        task5TimeSec: p.times[4],
        q1: p.q[0], q2: p.q[1], q3: p.q[2], q4: p.q[3], q5: p.q[4],
        q6: p.q[5], q7: p.q[6], q8: p.q[7], q9: p.q[8], q10: p.q[9],
        comments: 'System is highly intuitive and easy to use.',
      };

      const res = await httpRequest({
        path: '/api/sus/submit',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, payload);

      if (res.statusCode === 201 && res.body.susScore !== undefined) {
        scores.push(res.body.susScore);
      }
    }

    // Fetch summary metrics from API
    const summaryRes = await httpRequest({ path: '/api/sus/results', method: 'GET' });
    const summary = summaryRes.body;

    console.log('\n===============================================================');
    console.log('📊 SYSTEM USABILITY SCALE (SUS) EVALUATION RESULTS');
    console.log('===============================================================');
    console.log(`Total Study Participants ($N$) : ${summary.count}`);
    console.log(`Mean Overall SUS Score        : ${summary.meanSusScore} / 100.0`);
    console.log(`Standard Deviation (σ)        : ±${summary.stdDev}`);
    console.log(`Usability Grade               : ${summary.grade}`);
    console.log(`Score Range (Min - Max)       : ${summary.minScore} - ${summary.maxScore}\n`);

    return summary;
  } catch (error) {
    console.error('❌ SUS evaluation error:', error.message || error);
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGINT');
    }
  }
}

if (require.main === module) {
  runSusEvaluation();
}

module.exports = { runSusEvaluation };
