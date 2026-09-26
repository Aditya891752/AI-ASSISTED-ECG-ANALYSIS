"""
make_demo_signals.py
────────────────────
Extracts real ECG segments from MIT-BIH binary records and saves them
as CSV files you can drag-and-drop into the PS-03 demo app.

Creates 4 demo files in demo_signals/:
  1. demo_normal.csv       — pure normal sinus rhythm (record 100)
  2. demo_pvc.csv          — record with frequent PVCs (record 119, V beats)
  3. demo_afib.csv         — record with supraventricular beats (record 207, S beats)
  4. demo_mixed.csv        — mix of all classes (record 208, N+V+F)

Each file = 10 seconds of raw ECG signal at 360 Hz = 3600 samples
Just drag any of these into the Screen page → click Analyse ECG
"""
import sys, os
sys.path.insert(0, 'D:\\Lib\\site-packages')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np

BASE = r'd:\ideathon\mitbih_extracted\mit-bih-arrhythmia-database-1.0.0'
OUT  = r'd:\ideathon\ps03-ecg-backend\demo_signals'
os.makedirs(OUT, exist_ok=True)

FS = 360  # MIT-BIH sampling rate

def load_signal(record_id, start_sec=30, duration_sec=10):
    """Load a segment of raw ECG signal using wfdb or fallback to mitbih_reader."""
    try:
        import wfdb
        record = wfdb.rdrecord(os.path.join(BASE, str(record_id)))
        sig = record.p_signal[:, 0]  # lead II
        start = start_sec * FS
        end   = start + duration_sec * FS
        return sig[start:end]
    except Exception:
        from mitbih_reader import read_record
        sig, _fs, _peaks, _syms = read_record(BASE, str(record_id))
        start = start_sec * FS
        end   = start + duration_sec * FS
        return np.array(sig[start:end])

def save_csv(signal, filename, label, record_id, note):
    path = os.path.join(OUT, filename)
    # Save as plain comma-separated values (one sample per line)
    with open(path, 'w') as f:
        f.write('\n'.join(f'{v:.6f}' for v in signal))
    print(f'[OK] {filename}')
    print(f'     Record {record_id} | {len(signal)} samples ({len(signal)/FS:.1f}s @ {FS}Hz)')
    print(f'     {note}')
    print()

print('Extracting real MIT-BIH ECG segments...')
print()

# 1. Normal sinus rhythm — record 100 (almost all N beats)
sig = load_signal(100, start_sec=10, duration_sec=10)
save_csv(sig, 'demo_normal.csv', 'N',
         100, 'Pure normal sinus rhythm — expect all N (green) beats')

# 2. Ventricular ectopics (PVCs) — record 119 (444 V beats)
sig = load_signal(119, start_sec=20, duration_sec=10)
save_csv(sig, 'demo_pvc.csv', 'V',
         119, 'Frequent PVCs — expect V (red) beats mixed with N')

# 3. Supraventricular — record 207 (107 S beats, 210 V beats)
sig = load_signal(207, start_sec=15, duration_sec=10)
save_csv(sig, 'demo_svt.csv', 'S',
         207, 'Supraventricular + ventricular beats — S (amber) and V (red)')

# 4. Multi-class — record 208 (992 V, 372 F, 2 S — richest mix)
sig = load_signal(208, start_sec=60, duration_sec=15)
save_csv(sig, 'demo_mixed.csv', 'mixed',
         208, '15-second segment — V + F + N beats, great for showing colour legend')

print('Done! Files saved to demo_signals/')
print()
print('HOW TO USE IN THE DEMO:')
print('  1. Run demo_start.bat')
print('  2. Go to the Screen page')
print('  3. Drag any file from demo_signals/ into the upload box')
print('  4. Click "Analyse ECG"')
print('  5. See beat-by-beat classification with colours on the waveform')
