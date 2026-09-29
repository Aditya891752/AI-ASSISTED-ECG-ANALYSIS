import asyncio
import numpy as np
from app.schemas.ecg import ScreeningRequest
from app.services.model_service import ModelService
from app.services.screening_service import screen_single


async def main():
    ms = ModelService("model/model.pkl")
    await ms.load()
    print("Model loaded successfully")

    # Generate synthetic 10-second ECG at 360 Hz (3600 samples)
    fs = 360
    t = np.arange(3600) / fs
    ecg_base = np.sin(2 * np.pi * 1.2 * t)
    for p in range(180, 3600, 360):
        ecg_base[p-5:p+5] += 2.0

    # 1. Single lead request
    req1 = ScreeningRequest(signal=list(ecg_base), sample_rate=fs)
    res1 = await screen_single(req1, ms, None)
    print("Test 1 (Single lead): mode=", res1.lead_mode, "beats=", res1.total_beats, "benchmark=", res1.benchmark_accuracy)
    assert res1.lead_mode == "2-lead"
    assert res1.total_beats > 0

    # 2. 12-lead request
    signals_12 = {
        "I": list(ecg_base * 0.8),
        "II": list(ecg_base * 1.0),
        "V1": list(ecg_base * 0.5),
        "V2": list(ecg_base * 0.6),
        "V3": list(ecg_base * 0.7),
        "V4": list(ecg_base * 0.9),
        "V5": list(ecg_base * 0.8),
        "V6": list(ecg_base * 0.7),
    }
    req2 = ScreeningRequest(signals=signals_12, lead_mode="12-lead", sample_rate=fs)
    res2 = await screen_single(req2, ms, None)
    print("Test 2 (12-lead): mode=", res2.lead_mode, "beats=", res2.total_beats, "derived=", res2.derived_leads)
    print("MI Localization:", res2.mi_localization["status"], "-", res2.mi_localization["clinical_summary"])
    assert res2.lead_mode == "12-lead"
    assert "III" in res2.derived_leads
    assert "aVR" in res2.derived_leads
    assert res2.mi_localization["available"] is True

    print("ALL END-TO-END SCREENING TESTS PASSED!")


if __name__ == "__main__":
    asyncio.run(main())
