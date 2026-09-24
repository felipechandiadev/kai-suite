use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LiteError {
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    Unauthorized(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Conflict(String),
    #[error(transparent)]
    Db(#[from] sqlx::Error),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl LiteError {
    pub fn code(&self) -> i32 {
        match self {
            Self::BadRequest(_) => 400,
            Self::Unauthorized(_) => 401,
            Self::NotFound(_) => 404,
            Self::Conflict(_) => 409,
            Self::Db(_) | Self::Other(_) => 500,
        }
    }

    pub fn into_command_err(self) -> String {
        serde_json::to_string(&LiteErrorDto {
            code: self.code(),
            message: self.to_string(),
        })
        .unwrap_or_else(|_| self.to_string())
    }
}

#[derive(Serialize)]
struct LiteErrorDto {
    code: i32,
    message: String,
}

pub type LiteResult<T> = Result<T, LiteError>;
