CREATE DATABASE NoteAppDB;
GO

USE NoteAppDB;
GO

-- 1. Bảng Users (Tài khoản)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Username VARCHAR(100) NOT NULL UNIQUE,
        PasswordHash VARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
END
GO

-- 2. Bảng Notebooks (Sổ tay)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notebooks')
BEGIN
    CREATE TABLE Notebooks (
        Id UNIQUEIDENTIFIER PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL,
        UpdatedAt DATETIME2 NOT NULL,
        CONSTRAINT FK_Notebooks_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
END
GO

-- 3. Bảng Notes (Ghi chú)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notes')
BEGIN
    CREATE TABLE Notes (
        Id UNIQUEIDENTIFIER PRIMARY KEY,
        NotebookId UNIQUEIDENTIFIER NULL,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Title NVARCHAR(255) NOT NULL,
        Content NVARCHAR(MAX) NOT NULL,
        IsPrivate BIT NOT NULL DEFAULT 0,
        IsPinned BIT NOT NULL DEFAULT 0,
        IsTrashed BIT NOT NULL DEFAULT 0,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL,
        UpdatedAt DATETIME2 NOT NULL,
        CONSTRAINT FK_Notes_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_Notes_Notebooks FOREIGN KEY (NotebookId) REFERENCES Notebooks(Id) ON DELETE NO ACTION
    );
END
GO

-- 4. Bảng DailyTasks (Nhiệm vụ hàng ngày)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DailyTasks')
BEGIN
    CREATE TABLE DailyTasks (
        Id UNIQUEIDENTIFIER PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Title NVARCHAR(255) NOT NULL,
        ReminderTime VARCHAR(10) NULL,
        LastCompletionDate DATE NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL,
        UpdatedAt DATETIME2 NOT NULL,
        CONSTRAINT FK_DailyTasks_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
END
GO

-- 5. Bảng TaskCompletions (Lịch sử hoàn thành)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TaskCompletions')
BEGIN
    CREATE TABLE TaskCompletions (
        Id UNIQUEIDENTIFIER PRIMARY KEY,
        TaskId UNIQUEIDENTIFIER NOT NULL,
        CompletionDate DATE NOT NULL,
        CompletedAt DATETIME2 NOT NULL,
        UpdatedAt DATETIME2 NOT NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TaskCompletions_DailyTasks FOREIGN KEY (TaskId) REFERENCES DailyTasks(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_Task_CompletionDate UNIQUE (TaskId, CompletionDate)
    );
END
GO

-- =======================================================
-- TỐI ƯU HÓA TRUY VẤN PULL SYNC (INDEXING)
-- =======================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notebooks_UserId_UpdatedAt')
    CREATE INDEX IX_Notebooks_UserId_UpdatedAt ON Notebooks(UserId, UpdatedAt);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notes_UserId_UpdatedAt')
    CREATE INDEX IX_Notes_UserId_UpdatedAt ON Notes(UserId, UpdatedAt);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DailyTasks_UserId_UpdatedAt')
    CREATE INDEX IX_DailyTasks_UserId_UpdatedAt ON DailyTasks(UserId, UpdatedAt);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TaskCompletions_TaskId_UpdatedAt')
    CREATE INDEX IX_TaskCompletions_TaskId_UpdatedAt ON TaskCompletions(TaskId, UpdatedAt);
GO
