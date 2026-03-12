# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy solution and restore
COPY Spender.slnx .
COPY Spender.Shared/Spender.Shared.csproj Spender.Shared/
COPY Spender.API/Spender.API.csproj Spender.API/
COPY Spender.Auth/Spender.Auth.csproj Spender.Auth/
COPY Spender.Transactions/Spender.Transactions.csproj Spender.Transactions/
COPY Spender.Categories/Spender.Categories.csproj Spender.Categories/
COPY Spender.Analytics/Spender.Analytics.csproj Spender.Analytics/
RUN dotnet restore

# Copy everything and build
COPY . .
RUN dotnet publish Spender.API -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Spender.API.dll"]