import os
import tensorflow as tf
from tensorflow.keras import layers, models
import pandas as pd
import numpy as np
from pathlib import Path
import cv2
from sklearn.model_selection import train_test_split
import albumentations as A
from tqdm import tqdm
import argparse
from backend.utils import DRDataGenerator  # Import from utils.py
from backend.train import create_model, train_model  # Use absolute import
from tensorflow.keras.preprocessing.image import ImageDataGenerator

class DRDataGenerator:
    def __init__(self, data_dir, img_size=(224, 224), batch_size=32, validation_split=0.2):
        self.data_dir = data_dir
        self.img_size = img_size
        self.batch_size = batch_size
        self.validation_split = validation_split
        self.datagen = ImageDataGenerator(
            rescale=1./255,
            validation_split=self.validation_split,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            fill_mode='nearest'
        )

    def get_train_generator(self):
        return self.datagen.flow_from_directory(
            self.data_dir,
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='training'
        )

    def get_validation_generator(self):
        return self.datagen.flow_from_directory(
            self.data_dir,
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='validation'
        )

def preprocess_data(data_dir: Path):
    df = pd.read_csv(data_dir / 'trainLabels.csv')
    image_paths = [(data_dir / 'train' / f"{id}.jpeg") for id in df['image']]
    labels = df['level'].values

    train_paths, val_paths, train_labels, val_labels = train_test_split(
        image_paths, labels,
        test_size=0.5,
        stratify=labels,
        random_state=42
    )

    return train_paths, val_paths, train_labels, val_labels

def main(data_dir: Path, epochs=50, batch_size=32):
    train_paths, val_paths, train_labels, val_labels = preprocess_data(data_dir)

    train_gen = DRDataGenerator(train_paths, train_labels, batch_size=batch_size, augment=True)
    val_gen = DRDataGenerator(val_paths, val_labels, batch_size=batch_size, augment=False)

    model = create_model()
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-4),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            'best_model.h5',
            save_best_only=True,
            monitor='val_accuracy'
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            verbose=1
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        ),
        tf.keras.callbacks.LearningRateScheduler(
            lambda epoch: 1e-4 * 10**(epoch / 20)
        ),
        tf.keras.callbacks.TensorBoard(log_dir='./logs', histogram_freq=1)
    ]

    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=epochs,
        callbacks=callbacks,
        use_multiprocessing=True
    )

    model.save('best_model.h5')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Train DR detection model')
    parser.add_argument('--data-dir', type=str, required=True,
                      help='Path to dataset directory')
    parser.add_argument('--epochs', type=int, default=50,
                      help='Number of epochs to train')
    parser.add_argument('--batch-size', type=int, default=32,
                      help='Batch size for training')

    args = parser.parse_args()

    main(Path(args.data_dir), epochs=args.epochs, batch_size=args.batch_size)
