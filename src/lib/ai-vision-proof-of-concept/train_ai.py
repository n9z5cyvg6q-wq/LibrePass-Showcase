import os
from ultralytics import YOLO

# --- THE APPLE SILICON FIX ---
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

def validate_paths(yaml_path):
    # Check if data.yaml exists
    if not os.path.exists(yaml_path):
        print(f"❌ ERROR: Could not find data.yaml at {yaml_path}")
        return False
    return True

def main():
    print("🚀 Initializing YOLOv8 Nano Model...")
    
    # 1. Define paths
    base_dir = os.getcwd()
    yaml_path = os.path.join(base_dir, "dataset", "data.yaml")
    
    # 2. Validate
    if not validate_paths(yaml_path):
        return

    print(f"📂 Verified data at: {yaml_path}")
    model = YOLO("yolov8n.pt") 
    
    print("🔥 STARTING NEURAL ENGINE TRAINING (MPS)...")
    
    # 3. Run Training
    model.train(
        data=yaml_path,
        epochs=50,       
        imgsz=640,        
        device="mps",     
        batch=8,          
        workers=0,        # Set workers to 0 for MacOS to avoid multiprocessing memory issues
        project="LibrePass_AI", 
        name="yolov8_custom_car"
    )
    
    print("\n🎉 TRAINING COMPLETE!")
    print("Move 'best.pt' to your main folder and rename it to 'custom_yolo.pt'")

if __name__ == "__main__":
    main()