# Motor gratuito de v�deo en la nube

Este m�dulo conecta la aplicaci�n de escritorio con **Wan 2.1 T2V 1.3B** ejecutado en una GPU gratuita de Google Colab. No necesita una API de pago.

## Arranque

1. Abre `NAFRI_OGA_Free_Video_Colab.ipynb` en Google Colab.
2. Selecciona **Entorno de ejecuci�n > Cambiar tipo de entorno > GPU T4**.
3. Ejecuta las celdas en orden. La primera instalaci�n y descarga del modelo tarda varios minutos.
4. Copia la URL y el token que muestra la �ltima celda.
5. En la aplicaci�n: **Ajustes > Modelos locales > Servidor remoto**. Pega ambos datos, pulsa **Comprobar** y despu�s **Guardar**.
6. En **V�deo > Texto a v�deo**, selecciona **Wan 2.1 1.3B (Text-to-Video)**.

## L�mites reales

- Colab gratuito no garantiza GPU ni duraci�n de sesi�n. La URL cambia al reiniciar.
- La celda de arranque debe permanecer ejecut�ndose.
- Este trabajador gratuito ofrece texto a v�deo a 480p. Los modelos de 14B no caben de forma fiable en una T4 gratuita.
- El t�nel temporal de Cloudflare no requiere cuenta. El token aleatorio impide que terceros usen el trabajador si descubren la URL.
- El modelo y sus pesos usan Apache-2.0. El t�nel y las bibliotecas se instalan desde sus repositorios oficiales.

## Arquitectura

La aplicaci�n usa su cliente MCP existente. `worker.py` implementa �nicamente el contrato necesario para consultar el modelo, enviar un trabajo, consultar progreso, cancelar y descargar el MP4. La inferencia se realiza con Diffusers y los pesos oficiales de Wan 2.1.

