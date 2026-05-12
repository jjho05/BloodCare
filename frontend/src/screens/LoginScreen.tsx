import { useState } from 'react';
import { motion } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';
import { Droplet } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-5 space-y-10 bg-surface"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
          <Droplet className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">BloodCare</h1>
          <p className="text-on-surface-variant font-medium">
            {isRegistering ? 'Crea tu cuenta soberana' : 'Bienvenido a BloodCare AI'}
          </p>
        </div>
      </div>

      <div className="w-full max-w-[400px] flex flex-col space-y-6">
        <div className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">
                Nombre Completo
              </label>
              <input
                type="text"
                placeholder="Tu nombre"
                className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contraseña</label>
              {!isRegistering && (
                <button className="text-xs font-bold text-primary">Olvidé mi contraseña</button>
              )}
            </div>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full h-12 bg-white border border-outline-variant rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        <button
          onClick={onLogin}
          className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
        </button>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-sm font-bold text-primary text-center"
        >
          {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
        </button>

        <div className="flex items-center gap-4">
          <div className="h-[0.5px] flex-1 bg-outline-variant/30"></div>
          <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">O</span>
          <div className="h-[0.5px] flex-1 bg-outline-variant/30"></div>
        </div>

        <GoogleLogin onSuccess={onLogin} onError={() => {}} shape="pill" theme="outline" width="100%" />

        <p className="mt-4 text-center text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">
          Hackatec ITCM Local Stage 2026
        </p>
      </div>
    </motion.div>
  );
};

export default LoginScreen;
