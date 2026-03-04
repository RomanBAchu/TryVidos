# Этап сборки
FROM ://mcr.microsoft.com AS build
WORKDIR /src
COPY ["AMBE.csproj", "."]
RUN dotnet restore "AMBE.csproj"
COPY . .
RUN dotnet publish "AMBE.csproj" -c Release -o /app/publish

# Этап запуска
FROM ://mcr.microsoft.com
WORKDIR /app
COPY --from=build /app/publish .
# Render сам подставит PORT, но мы слушаем 8080 по умолчанию
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "AMBE.dll"]
