import logging
import logging.handlers
from pathlib import Path
from .config import Config

# Create logs directory
LOGS_DIR = Config.BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

def setup_logging():
    """Configure logging for the application"""
    
    log_format = "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
    
    # Set root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(Config.LOG_LEVEL)
    
    # File handler
    file_handler = logging.handlers.RotatingFileHandler(
        LOGS_DIR / Config.LOG_FILE,
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(logging.Formatter(log_format))
    root_logger.addHandler(file_handler)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(log_format))
    root_logger.addHandler(console_handler)
    
    return root_logger


def get_logger(name: str):
    """Get logger for a specific module"""
    return logging.getLogger(name)
