export default function PrivacyPolicy() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Aviso de Privacidad</h1>
      <p>
        En <strong>yugiohgenesys.com.mx</strong> respetamos tu privacidad. 
        Este sitio no solicita, recopila ni almacena datos personales sensibles.
      </p>
      <p className="mt-2">
        La información que pueda derivarse del uso de la aplicación (como la
        creación de mazos) se procesa únicamente en el navegador del usuario
        y no se comparte con terceros.
      </p>
      <p className="mt-2">
        Si tienes alguna duda, puedes escribirnos a:
        <a
          href="mailto:alexis.alaraa@gmail.com"
          className="text-blue-600 underline ml-1"
        >
          alexis.alaraa@gmail.com
        </a>.
      </p>
    </div>
  );
}
