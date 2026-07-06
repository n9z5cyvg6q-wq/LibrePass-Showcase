# 🏎️ Multi-Class Object & ALPR Detection (Proxy Project)

> **Context:** The production Edge-AI computer vision models for Libre Systems (including the ALPR pipelines) are maintained in a private repository to protect corporate intellectual property. This proxy project demonstrates my custom machine learning workflow and multi-class computer vision training capabilities from scratch.

## 📊 Dataset Architecture
The custom dataset was manually captured, and **Roboflow was utilized exclusively as a labeling tool** to generate the annotations. The dataset is structured to independently detect both the physical vehicle and its localized license plate across diverse environmental states.

### Core Configuration (`data.yaml`):
* **Target Classes:** 2 (Vehicle, License Plate)
* **Annotation Format:** YOLO darknet bounding box coordinates `[class_id, x_center, y_center, width, height]` normalized between 0 and 1. 
* **Pre-processing:** Applied static image resizing and bounding-box alignment to optimize feature extraction for both macro objects (cars) and micro-features (plates).

---

## 🧠 Local Compute & Training Pipeline (Apple Silicon M4 Pro)
While many developers rely on managed cloud GPUs (AWS/GCP) or automated web training, the entire training pipeline for this model was engineered and executed **100% locally on an Apple Silicon M4 Pro**. The Python architecture handles the following end-to-end steps:

1.  **Local Data Ingestion:** Loads the structural mapping defined in `data.yaml` to process the local filesystem into training batches.
2.  **Hardware-Accelerated Optimization:** Tracks bounding-box regression loss and independent class probability loss over multiple training epochs, utilizing the M4 Pro's architecture to efficiently minimize localization errors for both classes simultaneously.
3.  **Weight Generation:** Exports the optimized model weights directly to the local machine once validation accuracy stabilizes.

---

## 🚀 Live Inference Summary
The final trained weights are passed directly to an inference loop using Python and OpenCV. The script captures video frames, feeds them through the network, and dynamically draws distinct bounding boxes around both the toy car and its license plate in real-time.