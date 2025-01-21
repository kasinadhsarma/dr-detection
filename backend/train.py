import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from backend.utils import DRDataGenerator  # Import from utils.py
from backend.models import create_dr_model  # Use absolute import

def train_model(data_dir, epochs=10, batch_size=32, model_path='best_model.h5'):
    model = create_dr_model()
    
    data_generator = DRDataGenerator(data_dir, batch_size=batch_size)
    train_generator = data_generator.get_train_generator()
    validation_generator = data_generator.get_validation_generator()
    
    checkpoint = tf.keras.callbacks.ModelCheckpoint(
        model_path,
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    )
    
    history = model.fit(
        train_generator,
        epochs=epochs,
        validation_data=validation_generator,
        callbacks=[checkpoint]
    )
    
    return history.history['val_accuracy'][-1]

def load_model(model_path='best_model.h5'):
    model = create_dr_model()
    model.load_weights(model_path)
    return model