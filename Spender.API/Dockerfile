# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["Spender.API/Spender.API.csproj", "Spender.API/"]
COPY ["Spender.Shared/Spender.Shared.csproj", "Spender.Shared/"]
COPY ["Spender.Auth/Spender.Auth.csproj", "Spender.Auth/"]
COPY ["Spender.Transactions/Spender.Transactions.csproj", "Spender.Transactions/"]
COPY ["Spender.Categories/Spender.Categories.csproj", "Spender.Categories/"]
COPY ["Spender.Analytics/Spender.Analytics.csproj", "Spender.Analytics/"]
RUN dotnet restore "./Spender.API/Spender.API.csproj"
COPY . .
WORKDIR "/src/Spender.API"
RUN dotnet build "./Spender.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./Spender.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Spender.API.dll"]